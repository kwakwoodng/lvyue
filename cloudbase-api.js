(function () {
  'use strict';

  var config = window.LVYUE_CLOUDBASE || {};
  var key = String(config.accessKey || '');
  var validKey = Boolean(key && key !== 'VITE_CLOUDBASE_ACCESS_KEY');
  var onlinePage = location.protocol === 'http:' || location.protocol === 'https:';
  var sdk = window.cloudbase || window.tcb;
  var app = null;
  var initError = null;
  var storageKey = 'lvyue-cloudbase-session';

  if (sdk && validKey && onlinePage) {
    try { app = sdk.init({ env: config.env, region: config.region || 'ap-shanghai', accessKey: key, timeout: 20000 }); }
    catch (error) { initError = error; app = null; }
  }

  function storedSession() {
    try { return JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch (error) { return null; }
  }
  function saveSession(value) {
    try { if (value) localStorage.setItem(storageKey, JSON.stringify(value)); else localStorage.removeItem(storageKey); } catch (error) {}
  }
  function apiError(payload) {
    var detail = payload && payload.error || payload || {};
    var error = new Error(detail.message || detail.error || '云端操作失败');
    error.code = detail.code || 'CLOUD_ERROR';
    error.details = detail.details;
    return error;
  }
  async function callHttp(action, data, options) {
    var current = storedSession();
    var response;
    try {
      response = await fetch(config.httpEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: action,
          data: data || {},
          token: options && options.public ? undefined : current && current.token
        })
      });
    } catch (cause) {
      var transportError = new Error('云端连接失败，请刷新页面后重试');
      transportError.code = 'NETWORK_ERROR';
      transportError.cause = cause;
      throw transportError;
    }
    var text = await response.text();
    var result;
    try { result = text ? JSON.parse(text) : null; }
    catch (error) {
      var invalidResponse = new Error('云端返回内容格式错误');
      invalidResponse.code = 'INVALID_CLOUD_RESPONSE';
      throw invalidResponse;
    }
    if (!response.ok || !result || result.ok !== true) throw apiError(result);
    return result.data;
  }
  async function call(action, data, options) {
    if (config.httpEndpoint) return callHttp(action, data, options);
    if (!app) throw new Error(validKey ? 'CloudBase Web SDK 加载失败' : '尚未配置 CloudBase Publishable Key');
    var current = storedSession();
    var response = await app.callFunction({
      name: config.functionName || 'lvyue-api',
      parse: true,
      data: { action: action, data: data || {}, token: options && options.public ? undefined : current && current.token }
    });
    var result = response && response.result;
    if (typeof result === 'string') { try { result = JSON.parse(result); } catch (error) {} }
    if (!result || result.ok !== true) throw apiError(result);
    return result.data;
  }
  async function loginOrRegister(travelId, password) {
    var data = { travel_id: travelId, password: password };
    var result;
    try { result = await call('auth.register', data, { public: true }); }
    catch (error) {
      if (error.code !== 'TRAVEL_ID_TAKEN') throw error;
      result = await call('auth.login', data, { public: true });
    }
    saveSession({ token: result.token, user: result.user });
    return result;
  }
  async function currentUser() {
    var current = storedSession();
    if (!current || !current.token) return null;
    try {
      var user = await call('auth.me', {});
      saveSession({ token: current.token, user: user });
      return user;
    } catch (error) {
      if (error.code === 'UNAUTHORIZED' || error.code === 'INVALID_TOKEN') saveSession(null);
      throw error;
    }
  }
  function logout() { saveSession(null); }
  async function uploadFile(purpose, albumId, file, categoryIds, capturedAt) {
    var prepared = await call('storage.prepareUpload', {
      purpose: purpose,
      album_id: albumId || undefined,
      original_name: file.name || (purpose + '-' + Date.now() + '.jpg'),
      mime_type: file.type || 'application/octet-stream',
      byte_size: file.size
    });
    var bucket = app.storage.from(prepared.bucket_id || 'lvyue-media');
    var upload = await bucket.uploadToSignedUrl(prepared.object_key, prepared.upload_token, file);
    if (upload && upload.error) throw apiError(upload.error);
    return call('storage.completeUpload', {
      upload_intent_id: prepared.upload_intent_id,
      object_key: prepared.object_key,
      category_ids: categoryIds || [],
      captured_at: capturedAt || undefined
    });
  }
  async function mediaUrl(mediaId) { return (await call('media.url', { media_id: mediaId })).url; }
  async function assetUrl(kind, id) {
    var data = { kind: kind };
    if (kind === 'cover') data.album_id = id;
    else data.user_id = id;
    return (await call('storage.assetUrl', data)).url;
  }
  function filterValue(filter, key) {
    var match = String(filter || '').match(new RegExp('(?:^|&)' + key + '=eq\\.([^&]+)'));
    return match ? decodeURIComponent(match[1]) : '';
  }
  function requestBody(options) {
    if (!options || !options.body) return {};
    return typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
  }
  async function legacyRest(table, filter, options) {
    var method = String(options && options.method || 'GET').toUpperCase();
    var body = requestBody(options);
    if (table === 'notifications') return call('notifications.readAll', {});
    if (table === 'profiles' && method === 'GET') {
      var travelId = filterValue(filter, 'travel_id');
      try {
        var profile = await call('users.find', { travel_id: travelId });
        profile.avatar_url = profile.avatar_path ? await assetUrl('avatar', profile.user_id) : '';
        return [profile];
      } catch (error) { if (error.code === 'USER_NOT_FOUND') return []; throw error; }
    }
    if (table === 'profiles' && method === 'PATCH') return call('profile.update', { nickname: body.nickname });
    if (table === 'album_folders') {
      if (method === 'POST') return call('folders.create', { name: body.name });
      if (method === 'PATCH') return call('folders.update', { folder_id: filterValue(filter, 'id'), name: body.name });
      if (method === 'DELETE') return call('folders.delete', { folder_id: filterValue(filter, 'id') });
    }
    if (table === 'album_folder_items') {
      var albumId = body.album_id || filterValue(filter, 'album_id');
      return call('folders.assignAlbum', { album_id: albumId, folder_id: method === 'DELETE' ? null : body.folder_id });
    }
    if (table === 'friend_details' && method === 'POST') return call('friends.detail.update', { friend_id: body.friend_id, remark: body.remark, description: body.description });
    if (table === 'albums' && method === 'PATCH') return call('albums.update', { album_id: filterValue(filter, 'id'), title: body.title, description: body.description });
    if (table === 'album_categories') {
      if (method === 'POST') return call('categories.create', { album_id: body.album_id, name: body.name });
      if (method === 'PATCH') return call('categories.update', { category_id: filterValue(filter, 'id'), name: body.name });
      if (method === 'DELETE') return call('categories.delete', { category_id: filterValue(filter, 'id') });
    }
    if (table === 'media_likes') return call('likes.toggle', { media_id: body.media_id || filterValue(filter, 'media_id') });
    if (table === 'comments' && method === 'POST') return call('comments.create', { media_id: body.media_id, parent_id: body.parent_id, body: body.body });
    throw new Error('尚未迁移的云端操作：' + table + ' ' + method);
  }
  async function legacyRpc(name, params) {
    var map = {
      create_album: ['albums.create', { title: params.album_title, description: params.album_description }],
      send_friend_request: ['friends.request', { travel_id: params.target_travel_id }],
      respond_friend_request: ['friends.respond', { request_id: params.request_id, accept: params.accept_request }],
      invite_album_member: ['albums.invite', { album_id: params.target_album, user_id: params.target_user }],
      respond_album_invite: ['albums.invite.respond', { membership_id: params.membership_id, accept: params.accept_invite }]
    };
    var mapped = map[name];
    if (!mapped) throw new Error('尚未迁移的云端操作：' + name);
    var result = await call(mapped[0], mapped[1]);
    return name === 'create_album' ? result.id : (name === 'respond_album_invite' ? result.status : result);
  }

  window.LvyueCloud = {
    configured: Boolean(config.httpEndpoint || app),
    initError: initError ? String(initError.message || initError) : '',
    provider: config.httpEndpoint ? 'cloudbase-http' : 'cloudbase',
    call: call,
    session: storedSession,
    loginOrRegister: loginOrRegister,
    currentUser: currentUser,
    logout: logout,
    uploadFile: uploadFile,
    mediaUrl: mediaUrl,
    assetUrl: assetUrl,
    rest: legacyRest,
    rpc: legacyRpc,
    publicUrl: function (bucket, path) { return /^https?:\/\//.test(String(path || '')) ? path : ''; },
    signedUrl: async function (bucket, idOrPath) { return /^[0-9a-f-]{32,36}$/i.test(String(idOrPath || '')) ? mediaUrl(idOrPath) : ''; }
  };
})();
