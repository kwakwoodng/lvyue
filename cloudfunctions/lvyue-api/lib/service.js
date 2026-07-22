'use strict';

const { query, transaction } = require('./db');
const { assert, ApiError } = require('./errors');
const auth = require('./auth');
const storage = require('./storage');

const id = value => String(value || '').trim();
const text = (value, max, label) => {
  const result = String(value || '').trim();
  assert(result && result.length <= max, 400, 'INVALID_INPUT', `${label}不能为空且不能超过 ${max} 个字符`);
  return result;
};
const optionalText = (value, max, label) => {
  const result = String(value || '').trim();
  assert(result.length <= max, 400, 'INVALID_INPUT', `${label}不能超过 ${max} 个字符`);
  return result;
};
const bool = value => value === true;
const uuidArray = value => Array.from(new Set((Array.isArray(value) ? value : []).map(id).filter(Boolean)));

async function activeMember(userId, albumId, client, lock) {
  const result = await query(
    `select am.*, a.creator_id, a.title from album_members am join albums a on a.id=am.album_id
      where am.album_id=$1 and am.user_id=$2 and am.status='active' ${lock ? 'for update of am' : ''}`,
    [albumId, userId], client
  );
  assert(result.rows[0], 403, 'ALBUM_ACCESS_DENIED', '你不是该相簿的有效成员');
  return result.rows[0];
}

async function ownerMember(userId, albumId, client) {
  const member = await activeMember(userId, albumId, client);
  assert(member.role === 'owner', 403, 'OWNER_REQUIRED', '只有相簿创建者可以执行此操作');
  return member;
}

async function areFriends(firstId, secondId, client) {
  const result = await query(
    `select 1 from friendships where status='accepted'
      and ((requester_id=$1 and addressee_id=$2) or (requester_id=$2 and addressee_id=$1))`,
    [firstId, secondId], client
  );
  return Boolean(result.rows[0]);
}

async function notify(client, recipientId, actorId, type, message, entityType, entityId, payload) {
  if (!recipientId || recipientId === actorId) return;
  await query(
    `insert into notifications(recipient_id,actor_id,type,message,entity_type,entity_id,payload)
     values($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [recipientId, actorId || null, type, message, entityType || null, entityId || null, JSON.stringify(payload || {})], client
  );
}

function publicUser(row) {
  return {
    user_id: row.id || row.user_id,
    travel_id: row.travel_id,
    nickname: row.nickname,
    avatar_path: row.avatar_path || null,
    created_at: row.created_at
  };
}

async function register(event, data) {
  const travelId = auth.normalizeTravelId(data.travel_id);
  const password = auth.validatePassword(data.password);
  const attemptKey = await auth.checkLoginRateLimit(event, travelId);
  const passwordHash = await auth.hashPassword(password);
  try {
    const result = await query(
      `insert into app_users(travel_id,nickname,password_hash) values($1,$2,$3)
       returning id,travel_id,nickname,avatar_path,token_version,created_at`, [travelId, travelId, passwordHash]
    );
    await auth.recordLoginAttempt(attemptKey, true);
    return { token: auth.issueToken(result.rows[0]), user: publicUser(result.rows[0]) };
  } catch (error) {
    if (error.code === '23505') throw new ApiError(409, 'TRAVEL_ID_TAKEN', '该旅页 ID 已被使用');
    throw error;
  }
}

async function login(event, data) {
  const travelId = auth.normalizeTravelId(data.travel_id);
  const password = auth.validatePassword(data.password);
  const attemptKey = await auth.checkLoginRateLimit(event, travelId);
  const result = await query(
    `select id,travel_id,nickname,avatar_path,password_hash,token_version,created_at
       from app_users where travel_id=$1 and disabled_at is null`, [travelId]
  );
  const user = result.rows[0];
  const ok = user ? await auth.verifyPassword(password, user.password_hash) : false;
  await auth.recordLoginAttempt(attemptKey, ok);
  assert(ok, 401, 'INVALID_CREDENTIALS', '旅页 ID 或密码错误');
  return { token: auth.issueToken(user), user: publicUser(user) };
}

async function logoutAll(user) {
  await query('update app_users set token_version=token_version+1 where id=$1', [user.id]);
  return { success: true };
}

async function updateProfile(user, data) {
  const nickname = text(data.nickname, 20, '昵称');
  const result = await query(
    `update app_users set nickname=$2,updated_at=now() where id=$1
     returning id,travel_id,nickname,avatar_path,created_at`, [user.id, nickname]
  );
  return publicUser(result.rows[0]);
}

async function findUser(user, data) {
  const travelId = auth.normalizeTravelId(data.travel_id);
  const result = await query(
    'select id,travel_id,nickname,avatar_path,created_at from app_users where travel_id=$1 and disabled_at is null', [travelId]
  );
  assert(result.rows[0], 404, 'USER_NOT_FOUND', '没有找到该用户');
  return publicUser(result.rows[0]);
}

async function listFriends(user) {
  const result = await query(
    `select f.id as friendship_id,f.status,f.requester_id,f.addressee_id,f.created_at,
            u.id as user_id,u.travel_id,u.nickname,u.avatar_path,
            coalesce(fd.remark,u.nickname) as display_name,coalesce(fd.description,'') as description
       from friendships f
       join app_users u on u.id=case when f.requester_id=$1 then f.addressee_id else f.requester_id end
       left join friend_details fd on fd.owner_id=$1 and fd.friend_id=u.id
      where $1 in (f.requester_id,f.addressee_id) and f.status='accepted'
      order by display_name`, [user.id]
  );
  return result.rows;
}

async function listFriendRequests(user) {
  const result = await query(
    `select f.id,f.created_at,u.id as requester_id,u.travel_id,u.nickname,u.avatar_path
       from friendships f join app_users u on u.id=f.requester_id
      where f.addressee_id=$1 and f.status='pending' order by f.created_at desc`, [user.id]
  );
  return result.rows;
}

async function sendFriendRequest(user, data) {
  const travelId = auth.normalizeTravelId(data.travel_id);
  return transaction(async client => {
    const targetResult = await query('select id,nickname from app_users where travel_id=$1 and disabled_at is null', [travelId], client);
    const target = targetResult.rows[0];
    assert(target, 404, 'USER_NOT_FOUND', '没有找到该用户');
    assert(target.id !== user.id, 400, 'CANNOT_ADD_SELF', '不能添加自己为好友');
    const existing = await query(
      `select id,status from friendships where (requester_id=$1 and addressee_id=$2) or (requester_id=$2 and addressee_id=$1) for update`,
      [user.id, target.id], client
    );
    assert(!existing.rows[0] || existing.rows[0].status === 'rejected', 409, 'FRIENDSHIP_EXISTS', existing.rows[0] && existing.rows[0].status === 'accepted' ? '你们已经是好友' : '好友申请已存在');
    let request;
    if (existing.rows[0]) {
      request = (await query(
        `update friendships set requester_id=$2,addressee_id=$3,status='pending',updated_at=now() where id=$1 returning *`,
        [existing.rows[0].id, user.id, target.id], client
      )).rows[0];
    } else {
      request = (await query(
        `insert into friendships(requester_id,addressee_id) values($1,$2) returning *`, [user.id, target.id], client
      )).rows[0];
    }
    await notify(client, target.id, user.id, 'friend_request', `${user.nickname} 申请添加你为好友`, 'friendship', request.id);
    return request;
  });
}

async function respondFriendRequest(user, data) {
  return transaction(async client => {
    const result = await query(
      `select * from friendships where id=$1 and addressee_id=$2 and status='pending' for update`, [id(data.request_id), user.id], client
    );
    const request = result.rows[0];
    assert(request, 404, 'REQUEST_NOT_FOUND', '好友申请不存在或已处理');
    const status = bool(data.accept) ? 'accepted' : 'rejected';
    await query('update friendships set status=$2,updated_at=now() where id=$1', [request.id, status], client);
    if (status === 'accepted') await notify(client, request.requester_id, user.id, 'friend_accepted', `${user.nickname} 已同意你的好友申请`, 'friendship', request.id);
    return { id: request.id, status };
  });
}

async function updateFriendDetail(user, data) {
  const friendId = id(data.friend_id);
  assert(await areFriends(user.id, friendId), 403, 'NOT_FRIENDS', '只有好友可以设置备注');
  const remark = optionalText(data.remark, 30, '备注');
  const description = optionalText(data.description, 80, '描述');
  const result = await query(
    `insert into friend_details(owner_id,friend_id,remark,description) values($1,$2,$3,$4)
     on conflict(owner_id,friend_id) do update set remark=excluded.remark,description=excluded.description,updated_at=now()
     returning *`, [user.id, friendId, remark || null, description || null]
  );
  return result.rows[0];
}

async function removeFriend(user, data) {
  const friendId = id(data.friend_id);
  await query(
    `delete from friendships where status='accepted' and ((requester_id=$1 and addressee_id=$2) or (requester_id=$2 and addressee_id=$1))`,
    [user.id, friendId]
  );
  return { success: true };
}

async function createAlbum(user, data) {
  const title = text(data.title, 60, '相簿名称');
  const description = optionalText(data.description, 300, '相簿描述');
  return transaction(async client => {
    const album = (await query(
      `insert into albums(creator_id,title,description) values($1,$2,$3) returning *`, [user.id, title, description], client
    )).rows[0];
    await query(
      `insert into album_members(album_id,user_id,role,status,invited_by) values($1,$2,'owner','active',$2)`, [album.id, user.id], client
    );
    return album;
  });
}

async function listAlbums(user) {
  const albums = await query(
    `select a.*,am.role,am.status,afi.folder_id,af.name as folder_name,
       (select count(*)::int from media m where m.album_id=a.id) media_count
     from album_members am join albums a on a.id=am.album_id
     left join album_folder_items afi on afi.user_id=$1 and afi.album_id=a.id
     left join album_folders af on af.id=afi.folder_id
     where am.user_id=$1 and am.status='active' order by a.updated_at desc`, [user.id]
  );
  return albums.rows;
}

async function getAlbum(user, data) {
  const albumId = id(data.album_id);
  await activeMember(user.id, albumId);
  const [album, members, categories] = await Promise.all([
    query('select * from albums where id=$1', [albumId]),
    query(`select am.id,am.role,am.status,u.id as user_id,u.travel_id,u.nickname,u.avatar_path
             from album_members am join app_users u on u.id=am.user_id
            where am.album_id=$1 and am.status='active' order by am.created_at`, [albumId]),
    query('select * from album_categories where album_id=$1 order by position,created_at', [albumId])
  ]);
  return { ...album.rows[0], members: members.rows, categories: categories.rows };
}

async function updateAlbum(user, data) {
  const albumId = id(data.album_id);
  await activeMember(user.id, albumId);
  const title = text(data.title, 60, '相簿名称');
  const description = optionalText(data.description, 300, '相簿描述');
  const result = await query(
    'update albums set title=$2,description=$3,updated_at=now() where id=$1 returning *', [albumId, title, description]
  );
  return result.rows[0];
}

async function deleteAlbum(user, data) {
  const albumId = id(data.album_id);
  await ownerMember(user.id, albumId);
  await query('delete from albums where id=$1', [albumId]);
  return { success: true };
}

async function inviteAlbumMember(user, data) {
  const albumId = id(data.album_id);
  const targetId = id(data.user_id);
  const inviter = await activeMember(user.id, albumId);
  assert(await areFriends(user.id, targetId), 403, 'NOT_FRIENDS', '只能邀请好友加入相簿');
  return transaction(async client => {
    const existing = await query('select id,status from album_members where album_id=$1 and user_id=$2 for update', [albumId, targetId], client);
    assert(!existing.rows[0] || existing.rows[0].status === 'rejected', 409, 'MEMBERSHIP_EXISTS', '该用户已在相簿中或已有待处理邀请');
    let member;
    if (existing.rows[0]) {
      member = (await query(
        `update album_members set status='invited',invited_by=$2,updated_at=now() where id=$1 returning *`, [existing.rows[0].id, user.id], client
      )).rows[0];
    } else {
      member = (await query(
        `insert into album_members(album_id,user_id,role,status,invited_by) values($1,$2,'member','invited',$3) returning *`,
        [albumId, targetId, user.id], client
      )).rows[0];
    }
    await notify(client, targetId, user.id, 'album_invite', `${user.nickname} 邀请你加入相簿「${inviter.title}」`, 'album_member', member.id, { album_id: albumId });
    return member;
  });
}

async function respondAlbumInvite(user, data) {
  return transaction(async client => {
    const member = (await query(
      `select am.*,a.creator_id,a.title from album_members am join albums a on a.id=am.album_id
        where am.id=$1 and am.user_id=$2 and am.status='invited' for update of am`, [id(data.membership_id), user.id], client
    )).rows[0];
    assert(member, 404, 'INVITE_NOT_FOUND', '相簿邀请不存在或已处理');
    if (!bool(data.accept)) {
      await query(`update album_members set status='rejected',updated_at=now() where id=$1`, [member.id], client);
      return { status: 'rejected' };
    }
    const nextStatus = member.invited_by === member.creator_id ? 'active' : 'owner_review';
    await query('update album_members set status=$2,updated_at=now() where id=$1', [member.id, nextStatus], client);
    if (nextStatus === 'active') {
      await notify(client, member.creator_id, user.id, 'album_joined', `${user.nickname} 已加入相簿「${member.title}」`, 'album_member', member.id, { album_id: member.album_id });
    } else {
      await notify(client, member.creator_id, user.id, 'album_review', `${user.nickname} 申请加入相簿「${member.title}」，请审核`, 'album_member', member.id, { album_id: member.album_id });
    }
    return { status: nextStatus };
  });
}

async function reviewAlbumMember(user, data) {
  return transaction(async client => {
    const member = (await query(
      `select am.*,a.title from album_members am join albums a on a.id=am.album_id
        where am.id=$1 and am.status='owner_review' for update of am`, [id(data.membership_id)], client
    )).rows[0];
    assert(member, 404, 'REVIEW_NOT_FOUND', '待审核申请不存在');
    await ownerMember(user.id, member.album_id, client);
    const status = bool(data.approve) ? 'active' : 'rejected';
    await query('update album_members set status=$2,updated_at=now() where id=$1', [member.id, status], client);
    await notify(client, member.user_id, user.id, status === 'active' ? 'album_joined' : 'album_rejected', status === 'active' ? `创建者已同意你加入相簿「${member.title}」` : `创建者未同意你加入相簿「${member.title}」`, 'album_member', member.id, { album_id: member.album_id });
    return { status };
  });
}

async function listAlbumInvites(user) {
  const result = await query(
    `select am.id,am.album_id,am.status,am.created_at,a.title,a.description,
            u.id as inviter_id,u.travel_id as inviter_travel_id,u.nickname as inviter_nickname,u.avatar_path as inviter_avatar_path
       from album_members am join albums a on a.id=am.album_id left join app_users u on u.id=am.invited_by
      where am.user_id=$1 and am.status='invited' order by am.created_at desc`, [user.id]
  );
  return result.rows;
}

async function listAlbumReviews(user, data) {
  const albumId = id(data.album_id);
  await ownerMember(user.id, albumId);
  return (await query(
    `select am.id,am.created_at,u.id as user_id,u.travel_id,u.nickname,u.avatar_path
       from album_members am join app_users u on u.id=am.user_id
      where am.album_id=$1 and am.status='owner_review' order by am.created_at`, [albumId]
  )).rows;
}

async function createFolder(user, data) {
  const name = text(data.name, 30, '相簿分类名称');
  try {
    return (await query(
      `insert into album_folders(user_id,name,position)
       values($1,$2,coalesce((select max(position)+1 from album_folders where user_id=$1),0)) returning *`, [user.id, name]
    )).rows[0];
  } catch (error) {
    if (error.code === '23505') throw new ApiError(409, 'FOLDER_EXISTS', '该分类已存在');
    throw error;
  }
}

async function listFolders(user) {
  return (await query('select * from album_folders where user_id=$1 order by position,created_at', [user.id])).rows;
}

async function updateFolder(user, data) {
  const name = text(data.name, 30, '相簿分类名称');
  const result = await query('update album_folders set name=$3 where id=$1 and user_id=$2 returning *', [id(data.folder_id), user.id, name]);
  assert(result.rows[0], 404, 'FOLDER_NOT_FOUND', '分类不存在');
  return result.rows[0];
}

async function deleteFolder(user, data) {
  await query('delete from album_folders where id=$1 and user_id=$2', [id(data.folder_id), user.id]);
  return { success: true };
}

async function reorderFolders(user, data) {
  const ids = uuidArray(data.folder_ids);
  await transaction(async client => {
    const own = await query('select id from album_folders where user_id=$1 and id=any($2::uuid[])', [user.id, ids], client);
    assert(own.rowCount === ids.length, 403, 'FOLDER_ACCESS_DENIED', '分类列表中包含无权操作的数据');
    for (let index = 0; index < ids.length; index += 1) await query('update album_folders set position=$3 where id=$1 and user_id=$2', [ids[index], user.id, index], client);
  });
  return { success: true };
}

async function assignAlbumFolder(user, data) {
  const albumId = id(data.album_id);
  await activeMember(user.id, albumId);
  const folderId = id(data.folder_id) || null;
  if (folderId) {
    const own = await query('select 1 from album_folders where id=$1 and user_id=$2', [folderId, user.id]);
    assert(own.rows[0], 403, 'FOLDER_ACCESS_DENIED', '不能使用其他用户的分类');
  }
  await query(
    `insert into album_folder_items(user_id,album_id,folder_id) values($1,$2,$3)
     on conflict(user_id,album_id) do update set folder_id=excluded.folder_id,updated_at=now()`, [user.id, albumId, folderId]
  );
  return { success: true };
}

async function createCategory(user, data) {
  const albumId = id(data.album_id);
  await activeMember(user.id, albumId);
  const name = text(data.name, 30, '分类名称');
  try {
    return (await query(
      `insert into album_categories(album_id,name,position,created_by)
       values($1,$2,coalesce((select max(position)+1 from album_categories where album_id=$1),0),$3) returning *`,
      [albumId, name, user.id]
    )).rows[0];
  } catch (error) {
    if (error.code === '23505') throw new ApiError(409, 'CATEGORY_EXISTS', '该分类已存在');
    throw error;
  }
}

async function updateCategory(user, data) {
  const categoryId = id(data.category_id);
  const row = (await query('select album_id from album_categories where id=$1', [categoryId])).rows[0];
  assert(row, 404, 'CATEGORY_NOT_FOUND', '分类不存在');
  await activeMember(user.id, row.album_id);
  return (await query('update album_categories set name=$2 where id=$1 returning *', [categoryId, text(data.name, 30, '分类名称')])).rows[0];
}

async function deleteCategory(user, data) {
  const categoryId = id(data.category_id);
  const row = (await query('select album_id from album_categories where id=$1', [categoryId])).rows[0];
  assert(row, 404, 'CATEGORY_NOT_FOUND', '分类不存在');
  await activeMember(user.id, row.album_id);
  await query('delete from album_categories where id=$1', [categoryId]);
  return { success: true };
}

async function reorderCategories(user, data) {
  const albumId = id(data.album_id);
  const ids = uuidArray(data.category_ids);
  await activeMember(user.id, albumId);
  await transaction(async client => {
    const own = await query('select id from album_categories where album_id=$1 and id=any($2::uuid[])', [albumId, ids], client);
    assert(own.rowCount === ids.length, 400, 'INVALID_CATEGORY_ORDER', '排序列表包含其他相簿的分类');
    for (let index = 0; index < ids.length; index += 1) await query('update album_categories set position=$2 where id=$1', [ids[index], index], client);
  });
  return { success: true };
}

async function prepareUpload(user, data) {
  const purpose = ['avatar', 'cover', 'media'].includes(data.purpose) ? data.purpose : 'media';
  const mimeType = String(data.mime_type || '').toLowerCase();
  const size = Number(data.byte_size);
  storage.assertFileSize(mimeType, size, purpose);
  const albumId = purpose === 'avatar' ? null : id(data.album_id);
  if (albumId) await activeMember(user.id, albumId);
  assert(purpose !== 'cover' || !String(mimeType).startsWith('video/'), 400, 'INVALID_COVER', '封面必须是图片');
  assert(purpose !== 'avatar' || !String(mimeType).startsWith('video/'), 400, 'INVALID_AVATAR', '头像必须是图片');
  const objectKey = storage.createObjectKey({ purpose, userId: user.id, albumId, originalName: data.original_name, mimeType });
  const intent = (await query(
    `insert into upload_intents(user_id,album_id,purpose,object_key,mime_type,byte_size,original_name,expires_at)
     values($1,$2,$3,$4,$5,$6,$7,now()+interval '15 minutes') returning id,object_key,expires_at`,
    [user.id, albumId, purpose, objectKey, mimeType, size, text(data.original_name || '未命名文件', 255, '文件名')]
  )).rows[0];
  const upload = await storage.createSignedUpload(objectKey);
  return {
    upload_intent_id: intent.id,
    object_key: objectKey,
    bucket_id: upload.bucketId,
    upload_url: upload.url,
    upload_token: upload.token,
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    expires_at: intent.expires_at
  };
}

async function completeUpload(user, data) {
  const intentId = id(data.upload_intent_id);
  assert(await storage.objectExists(String(data.object_key || '')), 400, 'UPLOAD_NOT_FOUND', '未找到已上传文件，请重新上传');
  return transaction(async client => {
    const intent = (await query(
      `select * from upload_intents where id=$1 and user_id=$2 and completed_at is null and expires_at>now() for update`, [intentId, user.id], client
    )).rows[0];
    assert(intent && intent.object_key === data.object_key, 400, 'INVALID_UPLOAD_INTENT', '上传凭证无效或已过期');
    let result;
    if (intent.purpose === 'avatar') {
      result = (await query('update app_users set avatar_path=$2,updated_at=now() where id=$1 returning id,travel_id,nickname,avatar_path,created_at', [user.id, intent.object_key], client)).rows[0];
    } else if (intent.purpose === 'cover') {
      await activeMember(user.id, intent.album_id, client);
      result = (await query('update albums set cover_path=$2,updated_at=now() where id=$1 returning *', [intent.album_id, intent.object_key], client)).rows[0];
    } else {
      await activeMember(user.id, intent.album_id, client);
      const categoryIds = uuidArray(data.category_ids);
      if (categoryIds.length) {
        const valid = await query('select id from album_categories where album_id=$1 and id=any($2::uuid[])', [intent.album_id, categoryIds], client);
        assert(valid.rowCount === categoryIds.length, 400, 'INVALID_CATEGORIES', '包含无效的分类');
      }
      result = (await query(
        `insert into media(album_id,uploader_id,storage_path,media_type,original_name,mime_type,byte_size,captured_at)
         values($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
        [intent.album_id, user.id, intent.object_key, storage.mediaKind(intent.mime_type), intent.original_name, intent.mime_type, intent.byte_size, data.captured_at || null], client
      )).rows[0];
      for (const categoryId of categoryIds) await query('insert into media_categories(media_id,category_id) values($1,$2)', [result.id, categoryId], client);
      const members = await query(`select user_id from album_members where album_id=$1 and status='active' and user_id<>$2`, [intent.album_id, user.id], client);
      for (const member of members.rows) await notify(client, member.user_id, user.id, 'album_activity', `${user.nickname} 在共享相簿上传了新内容`, 'media', result.id, { album_id: intent.album_id });
    }
    await query('update upload_intents set completed_at=now() where id=$1', [intent.id], client);
    return result;
  });
}

async function listMedia(user, data) {
  const albumId = id(data.album_id);
  await activeMember(user.id, albumId);
  const mediaResult = await query(
    `select m.*,u.travel_id as uploader_travel_id,u.nickname as uploader_nickname,u.avatar_path as uploader_avatar_path,
       (select count(*)::int from media_likes ml where ml.media_id=m.id) like_count,
       exists(select 1 from media_likes ml where ml.media_id=m.id and ml.user_id=$2) liked,
       coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name) order by c.position)
          from media_categories mc join album_categories c on c.id=mc.category_id where mc.media_id=m.id),'[]'::jsonb) categories
     from media m join app_users u on u.id=m.uploader_id where m.album_id=$1 order by m.created_at desc`, [albumId, user.id]
  );
  return mediaResult.rows;
}

async function mediaUrl(user, data) {
  const media = (await query('select * from media where id=$1', [id(data.media_id)])).rows[0];
  assert(media, 404, 'MEDIA_NOT_FOUND', '照片或视频不存在');
  await activeMember(user.id, media.album_id);
  return { url: await storage.signedUrl('GET', media.storage_path, 3600), expires_in: 3600, original_name: media.original_name };
}

async function assetUrl(user, data) {
  const kind = String(data.kind || 'avatar');
  let objectKey = '';
  if (kind === 'avatar') {
    const targetUserId = id(data.user_id || user.id);
    const profile = (await query(
      'select avatar_path from app_users where id=$1 and disabled_at is null', [targetUserId]
    )).rows[0];
    assert(profile, 404, 'USER_NOT_FOUND', '没有找到该用户');
    objectKey = profile.avatar_path || '';
  } else if (kind === 'cover') {
    const albumId = id(data.album_id);
    await activeMember(user.id, albumId);
    const album = (await query('select cover_path from albums where id=$1', [albumId])).rows[0];
    assert(album, 404, 'ALBUM_NOT_FOUND', '相簿不存在');
    objectKey = album.cover_path || '';
  } else {
    throw new ApiError(400, 'INVALID_ASSET_KIND', '不支持的资源类型');
  }
  if (!objectKey) return { url: '', expires_in: 0 };
  return { url: await storage.signedUrl('GET', objectKey, 3600), expires_in: 3600 };
}

async function deleteMedia(user, data) {
  const media = (await query('select * from media where id=$1', [id(data.media_id)])).rows[0];
  assert(media, 404, 'MEDIA_NOT_FOUND', '照片或视频不存在');
  const member = await activeMember(user.id, media.album_id);
  assert(media.uploader_id === user.id || member.role === 'owner', 403, 'MEDIA_DELETE_DENIED', '只有上传者或相簿创建者可以删除');
  await query('delete from media where id=$1', [media.id]);
  try { await storage.deleteObject(media.storage_path); } catch (error) { console.error('storage delete failed', error); }
  return { success: true };
}

async function useExistingMediaAsCover(user, data) {
  const media = (await query(`select * from media where id=$1 and media_type='image'`, [id(data.media_id)])).rows[0];
  assert(media, 404, 'MEDIA_NOT_FOUND', '可用照片不存在');
  await activeMember(user.id, media.album_id);
  return (await query('update albums set cover_path=$2,updated_at=now() where id=$1 returning *', [media.album_id, media.storage_path])).rows[0];
}

async function toggleLike(user, data) {
  return transaction(async client => {
    const media = (await query('select m.*,u.nickname as uploader_name from media m join app_users u on u.id=m.uploader_id where m.id=$1', [id(data.media_id)], client)).rows[0];
    assert(media, 404, 'MEDIA_NOT_FOUND', '照片或视频不存在');
    await activeMember(user.id, media.album_id, client);
    const deleted = await query('delete from media_likes where media_id=$1 and user_id=$2 returning media_id', [media.id, user.id], client);
    if (deleted.rowCount) return { liked: false };
    await query('insert into media_likes(media_id,user_id) values($1,$2)', [media.id, user.id], client);
    await notify(client, media.uploader_id, user.id, 'like', `${user.nickname} 赞了你的照片`, 'media', media.id, { album_id: media.album_id });
    return { liked: true };
  });
}

async function listComments(user, data) {
  const media = (await query('select album_id from media where id=$1', [id(data.media_id)])).rows[0];
  assert(media, 404, 'MEDIA_NOT_FOUND', '照片或视频不存在');
  await activeMember(user.id, media.album_id);
  return (await query(
    `with recursive tree as (
       select c.*,0 depth,array[c.created_at] path from comments c where c.media_id=$1 and c.parent_id is null
       union all
       select c,t.depth+1,t.path||c.created_at from comments c join tree t on c.parent_id=t.id
     )
     select t.*,u.travel_id,u.nickname,u.avatar_path from tree t join app_users u on u.id=t.user_id order by path`, [data.media_id]
  )).rows;
}

async function createComment(user, data) {
  const mediaId = id(data.media_id);
  const body = text(data.body, 500, '评论');
  return transaction(async client => {
    const media = (await query('select * from media where id=$1', [mediaId], client)).rows[0];
    assert(media, 404, 'MEDIA_NOT_FOUND', '照片或视频不存在');
    await activeMember(user.id, media.album_id, client);
    let parent = null;
    if (data.parent_id) {
      parent = (await query('select * from comments where id=$1 and media_id=$2', [id(data.parent_id), mediaId], client)).rows[0];
      assert(parent, 400, 'INVALID_PARENT_COMMENT', '被回复的评论不存在');
    }
    const comment = (await query(
      'insert into comments(media_id,user_id,parent_id,body) values($1,$2,$3,$4) returning *', [mediaId, user.id, parent && parent.id, body], client
    )).rows[0];
    const recipient = parent ? parent.user_id : media.uploader_id;
    const type = parent ? 'reply' : 'comment';
    await notify(client, recipient, user.id, type, `${user.nickname}${parent ? ' 回复了你的评论：' : ' 评论了你的照片：'}${body.slice(0, 80)}`, 'media', media.id, { comment_id: comment.id, album_id: media.album_id });
    return comment;
  });
}

async function deleteComment(user, data) {
  const comment = (await query('select c.*,m.album_id from comments c join media m on m.id=c.media_id where c.id=$1', [id(data.comment_id)])).rows[0];
  assert(comment, 404, 'COMMENT_NOT_FOUND', '评论不存在');
  const member = await activeMember(user.id, comment.album_id);
  assert(comment.user_id === user.id || member.role === 'owner', 403, 'COMMENT_DELETE_DENIED', '只能删除自己的评论');
  await query('delete from comments where id=$1', [comment.id]);
  return { success: true };
}

async function listNotifications(user, data) {
  const limit = Math.min(Math.max(Number(data.limit || 50), 1), 100);
  const result = await query(
    `select n.*,u.travel_id as actor_travel_id,u.nickname as actor_nickname,u.avatar_path as actor_avatar_path
       from notifications n left join app_users u on u.id=n.actor_id
      where n.recipient_id=$1 and ($2::timestamptz is null or n.created_at<$2)
      order by n.created_at desc limit $3`, [user.id, data.before || null, limit]
  );
  return result.rows;
}

async function readNotification(user, data) {
  const result = await query('update notifications set read_at=coalesce(read_at,now()) where id=$1 and recipient_id=$2 returning *', [id(data.notification_id), user.id]);
  assert(result.rows[0], 404, 'NOTIFICATION_NOT_FOUND', '消息不存在');
  return result.rows[0];
}

async function readAllNotifications(user) {
  await query('update notifications set read_at=coalesce(read_at,now()) where recipient_id=$1', [user.id]);
  return { success: true };
}

const publicActions = { 'auth.register': register, 'auth.login': login };
const actions = {
  'auth.me': async user => publicUser(user), 'auth.logoutAll': logoutAll,
  'profile.update': updateProfile, 'users.find': findUser,
  'friends.list': listFriends, 'friends.requests': listFriendRequests, 'friends.request': sendFriendRequest,
  'friends.respond': respondFriendRequest, 'friends.detail.update': updateFriendDetail, 'friends.remove': removeFriend,
  'albums.create': createAlbum, 'albums.list': listAlbums, 'albums.get': getAlbum, 'albums.update': updateAlbum, 'albums.delete': deleteAlbum,
  'albums.invite': inviteAlbumMember, 'albums.invites': listAlbumInvites, 'albums.invite.respond': respondAlbumInvite,
  'albums.reviews': listAlbumReviews, 'albums.review.respond': reviewAlbumMember,
  'folders.create': createFolder, 'folders.list': listFolders, 'folders.update': updateFolder, 'folders.delete': deleteFolder,
  'folders.reorder': reorderFolders, 'folders.assignAlbum': assignAlbumFolder,
  'categories.create': createCategory, 'categories.update': updateCategory, 'categories.delete': deleteCategory, 'categories.reorder': reorderCategories,
  'storage.prepareUpload': prepareUpload, 'storage.completeUpload': completeUpload, 'storage.assetUrl': assetUrl,
  'media.list': listMedia, 'media.url': mediaUrl, 'media.delete': deleteMedia, 'media.useAsCover': useExistingMediaAsCover,
  'likes.toggle': toggleLike, 'comments.list': listComments, 'comments.create': createComment, 'comments.delete': deleteComment,
  'notifications.list': listNotifications, 'notifications.read': readNotification, 'notifications.readAll': readAllNotifications
};

async function dispatch(event) {
  const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || event);
  const action = String(body.action || event.action || '');
  const data = body.data || event.data || {};
  if (publicActions[action]) return publicActions[action](event, data);
  const handler = actions[action];
  assert(handler, 404, 'ACTION_NOT_FOUND', '接口不存在');
  const user = await auth.authenticate({ ...event, token: body.token || event.token });
  return handler(user, data, event);
}

module.exports = { dispatch };
