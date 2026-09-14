var coverTokyo = 'https://images.unsplash.com/photo-1493780474015-ba834fd0ce2f?auto=format&fit=crop&w=900&q=85';
var coverDali = 'https://images.unsplash.com/photo-1531884070720-875c762a8d05?auto=format&fit=crop&w=900&q=85';
var media = [
  {id:'m1',album:'tokyo',src:'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=650&q=85',people:['木木','小满'],by:'小满',date:'11月3日',likes:8,shape:'tall',comments:[['阿远','这一张像电影海报。']]},
  {id:'m2',album:'tokyo',src:'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=650&q=85',people:['木木'],by:'木木',date:'11月3日',likes:5,shape:'short',comments:[]},
  {id:'m3',album:'tokyo',src:'https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=650&q=85',people:['阿远','小满'],by:'阿远',date:'11月4日',likes:12,shape:'medium',comments:[['小满','走到这里时太阳刚好落下来。']]},
  {id:'m4',album:'tokyo',src:'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=650&q=85',people:['木木','阿远'],by:'木木',date:'11月5日',likes:9,shape:'medium',comments:[]},
  {id:'m5',album:'tokyo',src:'https://images.unsplash.com/photo-1526481280695-3c687fd643ed?auto=format&fit=crop&w=650&q=85',people:['小满'],by:'小满',date:'11月6日',likes:6,shape:'short',video:true,comments:[]},
  {id:'m6',album:'tokyo',src:'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=650&q=85',people:['木木','小满','阿远'],by:'阿远',date:'11月6日',likes:15,shape:'tall',comments:[]}
];
function storageGet(key) {
  try { return window.localStorage.getItem(key); } catch (error) { return null; }
}
function storageSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch (error) { /* file:// 预览模式不支持持久化时忽略 */ }
}
function storageRemove(key) {
  try { window.localStorage.removeItem(key); } catch (error) { /* file:// 预览模式不支持持久化时忽略 */ }
}
var accounts = JSON.parse(storageGet('lvyue-accounts') || '{}');
var currentLoginId = String(storageGet('lvyue-login') || '').toLowerCase();
var onlinePage = location.protocol === 'http:' || location.protocol === 'https:';
var cloudMode = Boolean(window.LvyueCloud && window.LvyueCloud.configured);
var cloudUserId = '';
var cloudProfiles = {};
var cloudCategories = {};
var cloudFolders = {};
var currentAccountState = currentLoginId && accounts[currentLoginId] ? storageGet('lvyue-user-'+currentLoginId) : null;
var state = JSON.parse(currentAccountState || storageGet('lvyue-demo') || 'null') || {
  user:{username:'mumu0825',nickname:'木木',id:'mumu0825',avatar:'木',avatarUrl:''},
  folder:'全部相簿',
  folders:['全部相簿','2025 年旅行','和家人','想再去一次'],
  people:['全部','木木','小满','阿远'],
  albums:[
    {id:'tokyo',title:'东京散步日记',place:'东京 · 2025.11.02 — 11.08',cover:coverTokyo,folder:'2025 年旅行',count:36,members:['木','满','远']},
    {id:'dali',title:'大理的风',place:'大理 · 2025.05.01 — 05.05',cover:coverDali,folder:'和家人',count:24,members:['木','林','妈']},
    {id:'island',title:'海边的周末',place:'东山岛 · 2024.09.14 — 09.16',cover:'https://images.unsplash.com/photo-1484291470158-b8f8d608850d?auto=format&fit=crop&w=900&q=85',folder:'想再去一次',count:18,members:['木','满']}
  ],
  friends:[
    {nickname:'小满',id:'xiaoman91',avatar:'满',color:'a2',remark:'小满',description:'一起走过 6 次旅行'},
    {nickname:'阿远',id:'ayuan88',avatar:'远',color:'a3',remark:'阿远',description:'东京散步搭子'},
    {nickname:'林林',id:'linlin09',avatar:'林',color:'a4',remark:'林林',description:'去山里的人'}
  ]
};
state.user.username = state.user.username || state.user.id || 'mumu0825';
state.user.id = state.user.username;
state.user.nickname = state.user.nickname || state.user.name || '木木';
state.user.avatarUrl = state.user.avatarUrl || '';
state.friends = state.friends.map(function(friend,index){
  if(!Array.isArray(friend))return friend;
  var ids=['xiaoman91','ayuan88','linlin09'];
  return {nickname:friend[0],id:ids[index]||('friend'+index),avatar:friend[1],color:friend[2],remark:friend[0],description:friend[3]};
});
state.albums.forEach(function(item){
  item.description=item.description||item.place||'';
  if(!item.categories){
    if(item.id==='tokyo')item.categories=['全部','木木','小满','阿远'];
    else if(item.id==='dali')item.categories=['全部','木木','林林','妈妈'];
    else if(item.id==='island')item.categories=['全部','木木','小满'];
    else item.categories=['全部'];
  }
});
state.friendRequests=state.friendRequests||[];
state.notifications=state.notifications||[];
state.albumInvites=state.albumInvites||[];
state.albumReviews=state.albumReviews||[];
var demoStateTemplate=JSON.parse(JSON.stringify(state));
function emptyAccountState(identifier){
  var username=String(identifier||'');
  return {
    user:{username:username,id:username,nickname:username,avatar:username.slice(0,1).toUpperCase(),avatarUrl:''},
    folder:'全部相簿',
    folders:['全部相簿'],
    people:['全部'],
    albums:[],
    friends:[],
    friendRequests:[],
    notifications:[],
    albumInvites:[],
    albumReviews:[]
  };
}
// 示例相簿只用于直接打开本地文件时的作品预览。线上数据必须完全来自云端。
if(onlinePage){state=emptyAccountState('');media=[];currentLoginId='';}
var app = document.getElementById('app');
var page = cloudMode?'login':currentLoginId&&accounts[currentLoginId]?'albums':'login';
var activeAlbum = 'tokyo';
var activePerson = '全部';
var popup = '';
var detail = '';
var replyingComment = '';
var toast = '';
var pendingCover = '';
var coverMenuOpen = false;
var coverLibraryOpen = false;
var pendingAvatar = '';
var selectedFriendId = '';
var pendingFriendProfile = null;
var selectedFiles = [];
var activeDragCancel = null;
var toastTimer = null;
var picker = document.getElementById('file-picker');

function save(){if(onlinePage||cloudMode)return;if(currentLoginId&&accounts[currentLoginId])storageSet('lvyue-user-'+currentLoginId,JSON.stringify(state));else storageSet('lvyue-demo',JSON.stringify(state));}
function passwordFingerprint(value){var hash=2166136261;for(var i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);}
function freshAccountState(username){return emptyAccountState(username);}
function freshCloudState(profile){return {user:{username:profile.travel_id,id:profile.travel_id,nickname:profile.nickname||profile.travel_id,avatar:(profile.nickname||profile.travel_id).slice(0,1).toUpperCase(),avatarUrl:''},folder:'全部相簿',folders:['全部相簿'],albums:[],friends:[],friendRequests:[],notifications:[],albumInvites:[]};}
function cloudProfileView(profile){if(!profile)return null;return {userId:profile.user_id,id:String(profile.travel_id),username:String(profile.travel_id),nickname:profile.nickname||String(profile.travel_id),avatar:(profile.nickname||String(profile.travel_id)).slice(0,1).toUpperCase(),avatarPath:profile.avatar_path||'',avatarUrl:profile.avatar_url||''};}
function rememberCloudProfiles(rows){(rows||[]).forEach(function(row){var view=cloudProfileView(row);cloudProfiles[String(row.user_id).toLowerCase()]=view;cloudProfiles[String(row.travel_id).toLowerCase()]=view;});}
async function hydrateCloudAvatars(profileMap){var profiles=profileMap||cloudProfiles,seen={},views=[];Object.keys(profiles).forEach(function(key){var view=profiles[key];if(view&&view.userId&&!seen[view.userId]){seen[view.userId]=true;views.push(view);}});await Promise.all(views.map(async function(view){if(!view.avatarPath)return;try{view.avatarUrl=await LvyueCloud.assetUrl('avatar',view.userId);}catch(error){view.avatarUrl='';}}));}
  function cloudIn(values){return 'in.('+values.map(function(value){return String(value);}).join(',')+')';}
  function mapCloudComments(commentRows){
    var rows=commentRows||[];
    function flattenReplies(parent){var result=[];rows.filter(function(item){return item.parent_id===parent.id;}).forEach(function(reply){result.push([reply.nickname,reply.body,parent.nickname,reply.travel_id,reply.id]);result=result.concat(flattenReplies(reply));});return result;}
    return rows.filter(function(item){return !item.parent_id;}).map(function(item){return [item.nickname,item.body,flattenReplies(item),item.travel_id,item.id];});
  }
  function embeddedRows(value){
    if(Array.isArray(value))return value;
    if(typeof value==='string'){try{var parsed=JSON.parse(value);return Array.isArray(parsed)?parsed:null;}catch(error){return null;}}
    return null;
  }
  async function mapWithConcurrency(items,limit,worker){
    var source=Array.from(items||[]),results=new Array(source.length),cursor=0;
    async function run(){while(true){var index=cursor++;if(index>=source.length)return;results[index]=await worker(source[index],index);}}
    var workers=[],count=Math.min(Math.max(1,limit||1),source.length);for(var i=0;i<count;i++)workers.push(run());
    await Promise.all(workers);return results;
  }
  // Legacy mutation handlers still call this hook. Mutations now update their
  // local entity directly, so the hook intentionally does not enqueue a full
  // account reload.
  function queueCloudSync(){return Promise.resolve();}
  async function loadCloudData(){
    var previousComments={};media.forEach(function(item){previousComments[item.id]=item.comments||[];});
    var basics=await Promise.all(['auth.me','friends.list','friends.requests','folders.list','albums.list','notifications.list','albums.invites'].map(function(action){return LvyueCloud.call(action,action==='notifications.list'?{limit:100}:{});}));
    var own=basics[0],friends=basics[1]||[],requests=basics[2]||[],folders=basics[3]||[],albumRows=basics[4]||[],notices=basics[5]||[],invites=basics[6]||[];
    if(!own)throw new Error('用户资料尚未创建');
    var nextCloudProfiles={},nextCloudCategories={},nextCloudFolders={},nextMedia=[],nextState=freshCloudState(own);
    function rememberNextProfiles(rows){(rows||[]).forEach(function(row){var view=cloudProfileView(row);nextCloudProfiles[String(row.user_id).toLowerCase()]=view;nextCloudProfiles[String(row.travel_id).toLowerCase()]=view;});}
  rememberNextProfiles([own]);
  nextState.folders=['全部相簿'].concat(folders.map(function(folder){nextCloudFolders[folder.name]=folder.id;return folder.name;}));
  nextState.folder=nextState.folders.indexOf(state.folder)>-1?state.folder:'全部相簿';
  nextState.friends=friends.map(function(friend){rememberNextProfiles([{user_id:friend.user_id,travel_id:friend.travel_id,nickname:friend.nickname,avatar_path:friend.avatar_path}]);return {nickname:friend.nickname,id:friend.travel_id,avatar:(friend.nickname||friend.travel_id).slice(0,1),avatarUrl:'',color:'a2',remark:friend.display_name||friend.nickname,description:friend.description||'新添加的好友',friendshipId:friend.friendship_id,userId:friend.user_id};});
  nextState.friendRequests=requests.map(function(request){rememberNextProfiles([{user_id:request.requester_id,travel_id:request.travel_id,nickname:request.nickname,avatar_path:request.avatar_path}]);return {requestId:request.id,fromId:request.travel_id,fromUserId:request.requester_id,nickname:request.nickname,avatar:(request.nickname||request.travel_id).slice(0,1),avatarUrl:'',createdAt:request.created_at};});
    var albumBundles=await mapWithConcurrency(albumRows,4,async function(albumRow){
      var pair=await Promise.all([LvyueCloud.call('albums.get',{album_id:albumRow.id}),LvyueCloud.call('media.list',{album_id:albumRow.id})]);
      var albumDetail=pair[0]||{},mediaRows=pair[1]||[],memberViews=albumDetail.members||[],categoryMap={};
      (albumDetail.categories||[]).forEach(function(category){categoryMap[category.name]=category.id;});
      var mappedRows=await mapWithConcurrency(mediaRows,6,async function(row){
        var src=await LvyueCloud.mediaUrl(row.id).catch(function(){return '';});
        var commentRows=embeddedRows(row.comments);
        // Compatibility for an older deployed cloud function. The current
        // media.list embeds comments, but a stale function returns no comments
        // property at all. Fall back only in that case so current deployments
        // keep the single-request path.
        if(commentRows===null&&!Object.prototype.hasOwnProperty.call(row,'comments')){
          commentRows=await LvyueCloud.call('comments.list',{media_id:row.id}).catch(function(error){console.warn('legacy comment sync failed',row.id,error);return null;});
        }
        var mappedComments=commentRows===null?(previousComments[row.id]||[]):mapCloudComments(commentRows);
        return {profiles:commentRows,item:{id:row.id,album:row.album_id,src:src,storagePath:row.storage_path,people:(row.categories||[]).map(function(category){return category.name;}),by:row.uploader_nickname,byId:row.uploader_travel_id,uploaderUserId:row.uploader_id,date:row.captured_at||new Date(row.created_at).toLocaleDateString('zh-CN'),likes:Number(row.like_count||0),liked:Boolean(row.liked),shape:'medium',comments:mappedComments,video:row.media_type==='video',originalName:row.original_name,mimeType:row.mime_type,byteSize:row.byte_size}};
      });
      var coverMedia=mediaRows.find(function(item){return item.storage_path===albumRow.cover_path;}),coverItem=coverMedia&&mappedRows.map(function(item){return item.item;}).find(function(item){return item.id===coverMedia.id;}),coverUrl=coverItem&&coverItem.src||'';
      if(!coverUrl&&albumRow.cover_path)coverUrl=await LvyueCloud.assetUrl('cover',albumRow.id).catch(function(){return '';});
      return {row:albumRow,categoryMap:categoryMap,members:memberViews,media:mappedRows,album:{id:albumRow.id,title:albumRow.title,place:albumRow.description||'',description:albumRow.description||'',cover:coverUrl,coverPath:albumRow.cover_path||'',folder:albumRow.folder_name||'',count:Number(albumRow.media_count||mediaRows.length),categories:['全部'].concat((albumDetail.categories||[]).map(function(item){return item.name;})),members:memberViews.map(function(item){return (item.nickname||item.travel_id).slice(0,1);}),memberIds:memberViews.map(function(item){return item.travel_id;}),ownerId:(memberViews.find(function(item){return item.role==='owner';})||{}).travel_id||'',ownerUserId:albumRow.creator_id}};
    });
    albumBundles.forEach(function(bundle){nextCloudCategories[bundle.row.id]=bundle.categoryMap;rememberNextProfiles(bundle.members.map(function(member){return {user_id:member.user_id,travel_id:member.travel_id,nickname:member.nickname,avatar_path:member.avatar_path};}));bundle.media.forEach(function(mapped){rememberNextProfiles(mapped.profiles);nextMedia.push(mapped.item);});nextState.albums.push(bundle.album);});
    nextState.albumReviews=[];
    var reviewBundles=await mapWithConcurrency(albumRows.filter(function(album){return album.role==='owner';}),4,async function(ownerAlbum){
      var rows=await LvyueCloud.call('albums.reviews',{album_id:ownerAlbum.id}).catch(function(){return [];});return {album:ownerAlbum,rows:rows};
    });
    reviewBundles.forEach(function(bundle){bundle.rows.forEach(function(review){rememberNextProfiles([{user_id:review.user_id,travel_id:review.travel_id,nickname:review.nickname,avatar_path:review.avatar_path}]);nextState.albumReviews.push({membershipId:review.id,albumId:bundle.album.id,albumTitle:bundle.album.title,userId:review.user_id,travelId:review.travel_id,nickname:review.nickname,createdAt:review.created_at});});});
  rememberNextProfiles(notices.filter(function(notice){return notice.actor_id&&notice.actor_travel_id;}).map(function(notice){return {user_id:notice.actor_id,travel_id:notice.actor_travel_id,nickname:notice.actor_nickname,avatar_path:notice.actor_avatar_path};}));
  rememberNextProfiles(invites.filter(function(item){return item.inviter_id&&item.inviter_travel_id;}).map(function(item){return {user_id:item.inviter_id,travel_id:item.inviter_travel_id,nickname:item.inviter_nickname,avatar_path:item.inviter_avatar_path};}));
  await hydrateCloudAvatars(nextCloudProfiles);
  var ownView=nextCloudProfiles[String(own.user_id).toLowerCase()];if(ownView)nextState.user.avatarUrl=ownView.avatarUrl;
  nextState.friends.forEach(function(friend){var view=nextCloudProfiles[String(friend.userId).toLowerCase()];if(view)friend.avatarUrl=view.avatarUrl;});
  nextState.friendRequests.forEach(function(request){var view=nextCloudProfiles[String(request.fromUserId).toLowerCase()];if(view)request.avatarUrl=view.avatarUrl;});
  nextState.notifications=notices.map(function(notice){return {id:notice.id,type:notice.type,text:notice.message,time:new Date(notice.created_at).toLocaleString('zh-CN'),read:Boolean(notice.read_at),actorId:notice.actor_travel_id||'',actorNickname:notice.actor_nickname||'',entityType:notice.entity_type,entityId:notice.entity_id};});
  nextState.albumInvites=invites.map(function(item){return {inviteId:item.id,albumId:item.album_id,albumTitle:item.title,albumDescription:item.description||'',fromId:item.inviter_travel_id||'',fromNickname:item.inviter_nickname||'好友',directJoin:Boolean(item.direct_join),createdAt:item.created_at};});
  cloudUserId=own.user_id;cloudProfiles=nextCloudProfiles;cloudCategories=nextCloudCategories;cloudFolders=nextCloudFolders;media=nextMedia;state=nextState;
}
async function persistCloudOrder(kind,names){if(!cloudMode)return;if(kind==='folder')await LvyueCloud.call('folders.reorder',{folder_ids:names.map(function(name){return cloudFolders[name];})});else await LvyueCloud.call('categories.reorder',{album_id:activeAlbum,category_ids:names.map(function(name){return cloudCategories[activeAlbum][name];})});}
function pushAccountMessage(accountId,type,text,meta){var targetId=String(accountId||'').toLowerCase();if(!targetId||targetId===currentLoginId)return;var targetState=JSON.parse(storageGet('lvyue-user-'+targetId)||'null');if(!targetState)return;targetState.notifications=targetState.notifications||[];var message={id:'notice-'+Date.now()+'-'+Math.random().toString(16).slice(2),type:type,text:text,time:'刚刚',createdAt:Date.now(),read:false,actorId:state.user.id,actorNickname:state.user.nickname};if(meta)Object.keys(meta).forEach(function(key){message[key]=meta[key];});targetState.notifications.unshift(message);storageSet('lvyue-user-'+targetId,JSON.stringify(targetState));}
function notifyAlbumMembers(albumData,type,text,meta){if(cloudMode)return;(albumData.memberIds||[]).forEach(function(memberId){pushAccountMessage(memberId,type,text,Object.assign({albumId:albumData.id,albumTitle:albumData.title},meta||{}));});}
function esc(v){ return String(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];}); }
function album(){ return state.albums.filter(function(a){return a.id===activeAlbum;})[0]; }
function isCurrentUserId(value){return String(value||'').toLowerCase()===String(currentLoginId||'').toLowerCase();}
function av(text,color){if(text===state.user.nickname&&state.user.avatarUrl)return '<span class="avatar '+(color||'')+'"><img src="'+state.user.avatarUrl+'" alt="'+esc(text)+'"></span>';return '<span class="avatar '+(color||'')+'">'+esc(text)+'</span>'; }
function latestUserProfile(userId){var id=String(userId||'').toLowerCase();if(!id)return null;if(cloudMode&&cloudProfiles[id])return cloudProfiles[id];if(id===currentLoginId)return state.user;var saved=JSON.parse(storageGet('lvyue-user-'+id)||'null');return saved&&saved.user?saved.user:null;}
function accountAv(userId,fallbackName,fallbackAvatar,color){var profile=latestUserProfile(userId),name=profile&&profile.nickname||fallbackName||String(userId||''),avatar=profile&&profile.avatar||fallbackAvatar||name.slice(0,1).toUpperCase(),avatarUrl=profile&&profile.avatarUrl||'';return avatarUrl?'<span class="avatar '+esc(color||'')+'"><img src="'+avatarUrl+'" alt="'+esc(name)+'"></span>':'<span class="avatar '+esc(color||'')+'">'+esc(avatar)+'</span>';}
function noticeActorId(notice){if(notice.actorId)return notice.actorId;var accountList=JSON.parse(storageGet('lvyue-accounts')||'{}'),text=String(notice.text||''),nickname=String(notice.actorNickname||'');var ids=Object.keys(accountList);for(var i=0;i<ids.length;i++){var profile=latestUserProfile(ids[i]);if(!profile)continue;var names=[String(profile.nickname||''),String(profile.id||''),String(profile.username||'')].filter(Boolean);if((nickname&&names.indexOf(nickname)>-1)||names.some(function(name){return text.indexOf(name)===0;}))return profile.id||ids[i];}return '';}
function friendAv(friend){return accountAv(friend.id,friend.nickname,friend.avatar,friend.color);}
function albumMemberAv(albumData,index){var memberId=(albumData.memberIds||[])[index],fallback=(albumData.members||[])[index]||'?';return accountAv(memberId,fallback,fallback,index===1?'a2':index===2?'a3':'');}
function updateToastDom(){var phone=document.querySelector('.phone'),current=document.querySelector('.toast');if(current)current.remove();if(!phone||!toast)return;var element=document.createElement('div');element.className='toast'+(page==='login'?' login-toast':'');element.setAttribute('role','status');element.textContent=toast;phone.appendChild(element);}
function notify(text){toast=text;updateToastDom();clearTimeout(toastTimer);toastTimer=setTimeout(function(){toast='';updateToastDom();},2200);}
function nav(){var albumIcon='<span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"></rect><circle cx="9" cy="10" r="2"></circle><path d="m5.5 17 4-4 3 3 2.5-2.5 3.5 3.5"></path></svg></span>';var profileIcon='<span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4.5 20c.7-4 3.2-6 7.5-6s6.8 2 7.5 6"></path></svg></span>';return '<nav class="bottom-nav"><button class="nav-item '+((page==='albums'||page==='album')?'active':'')+'" onclick="go(\'albums\')">'+albumIcon+'<span>相簿</span></button><button class="nav-item '+(page==='profile'?'active':'')+'" onclick="go(\'profile\')">'+profileIcon+'<span>主页</span></button></nav>';}
function headerBar(back){if(back)return '<header class="topbar"><button class="back" onclick="go(\'albums\')">‹</button><button class="icon-button" onclick="openPopup(\'settings\')">···</button></header>';var unread=(state.friendRequests||[]).length+(state.albumInvites||[]).length+(state.notifications||[]).filter(function(item){return !item.read;}).length;return '<header class="topbar"><div class="wordmark"><span class="mark">旅</span><span>旅页</span></div><button class="icon-button message-button" onclick="openPopup(\'messages\')">◌'+(unread?'<span class="message-badge">'+unread+'</span>':'')+'</button></header>';}
function shell(body,withNav){return '<section class="phone">'+body+(withNav===false?'':nav())+(popup?popupView():'')+(detail?detailView():'')+(toast?'<div class="toast">'+esc(toast)+'</div>':'')+'</section>';}

function albumsView(){
  var list=state.folder==='全部相簿'?state.albums:state.albums.filter(function(a){return a.folder===state.folder;});
  var cards=list.map(albumCard).join('');
  var folders=state.folders.map(function(f){return '<button class="folder '+(f===state.folder?'active':'')+'" onclick="setFolder(\''+esc(f)+'\')">'+(f==='全部相簿'?'▦':'⌁')+' '+esc(f)+'</button>';}).join('');
  var memoryCount=state.albums.reduce(function(total,item){return total+Number(item.count||0);},0);
  return shell('<div class="page">'+headerBar(false)+'<div class="eyebrow">PRIVATE TRAVEL ARCHIVE</div><h1>把共同经历的<br>每一页都留住。</h1><p class="subcopy">和同行的人一起保存照片、视频与当时的心情。</p><section class="hero"><div class="hero-content"><div class="eyebrow">这一年，我们走过</div><div class="hero-stats"><div class="hero-stat"><b>'+state.albums.length+'</b><span>本旅行相簿</span></div><div class="hero-stat"><b>'+memoryCount+'</b><span>份共同记忆</span></div><div class="hero-stat"><b>'+state.friends.length+'</b><span>位同行的人</span></div></div></div></section><div class="section-head"><h2>我的相簿</h2><button class="text-action" onclick="openPopup(\'folder\')">整理分类</button></div><div class="folder-row">'+folders+'</div><div class="album-list">'+cards+'<button class="empty-add" onclick="openPopup(\'album\')"><b>＋</b><span>新建一本相簿</span></button></div></div>');
}
function albumCard(a){
  var members=(a.members||[]).map(function(m,i){return albumMemberAv(a,i);}).join('');
  var memberCount=Math.max((a.memberIds||a.members||[]).length-1,0);
  return '<button class="album-card" onclick="openAlbum(\''+a.id+'\')"><div class="album-cover '+(a.cover?'':'no-cover')+'" '+(a.cover?'style="background-image:url(\''+a.cover+'\')"':'')+'><span class="album-place">'+(a.cover?esc(a.description||a.place||''):'上传照片后选择封面')+'</span></div><div class="album-info"><div><h3>'+esc(a.title)+'</h3><p>'+a.count+' 个片段 · '+memberCount+' 位同行的人</p></div><div class="member-stack">'+members+'</div></div></button>';
}
function albumView(){
  var a=album();
  if(!a){
    page='albums';
    activePerson='全部';
    return albumsView();
  }
  var records=media.filter(function(m){return m.album===a.id&&(activePerson==='全部'||m.people.indexOf(activePerson)>-1);});
  var members=(a.members||[]).map(function(m,i){return albumMemberAv(a,i);}).join('');
  var tabs=a.categories.map(function(person){var count=person==='全部'?records.length:media.filter(function(m){return m.album===a.id&&m.people.indexOf(person)>-1;}).length;return '<button class="tab '+(person===activePerson?'active':'')+'" onclick="setPerson(\''+esc(person)+'\')">'+esc(person)+'<small>'+count+'</small></button>';}).join('');
  return shell('<div class="page album-page">'+headerBar(true)+'<div class="cover-head '+(a.cover?'':'no-cover')+'" '+(a.cover?'style="background-image:url(\''+a.cover+'\')"':'')+'><div class="cover-title"><h1>'+esc(a.title)+'</h1><p>'+esc(a.description)+'</p></div></div><div class="album-actions"><button class="action primary" onclick="openPopup(\'upload\')">＋ 上传记忆</button><button class="action" onclick="openPopup(\'invite\')">♧ 邀请成员</button></div><div class="album-meta"><div><h2>共同的瞬间</h2><p class="subcopy">'+records.length+' 个片段 · 仅成员可见</p></div><div class="member-stack">'+members+'</div></div><div class="tabs">'+tabs+'<button class="tab" onclick="openPopup(\'person\')">＋</button></div><div class="memory-grid">'+records.map(memoryCard).join('')+'</div></div>');
}
function memoryCard(m){
  return '<button class="memory '+m.shape+'" onclick="openDetail(\''+m.id+'\')"><img src="'+m.src+'" alt="旅行记忆" loading="lazy">'+(m.video?'<span class="video-badge">▶</span>':'')+'<span class="memory-overlay"><span>'+esc(m.date)+' · '+esc(m.by)+'</span><span class="memory-like">♡ '+m.likes+'</span></span></button>';
}
function profileView(){
  var friends=state.friends.map(function(f){return '<div class="friend">'+friendAv(f)+'<div class="friend-info"><b>'+esc(f.remark||f.nickname)+'</b><span>'+esc(f.description||'暂无描述')+'</span></div><button onclick="openFriendCard(\''+esc(f.id)+'\')">查看</button></div>';}).join('');
  var profileAvatar=state.user.avatarUrl?'<img src="'+state.user.avatarUrl+'" alt="'+esc(state.user.nickname)+'">':esc(state.user.avatar);
  return shell('<div class="page">'+headerBar(false)+'<section class="profile-card profile-card-first"><div class="profile-top"><div class="profile-avatar">'+profileAvatar+'</div><div><h3 class="profile-name">'+esc(state.user.nickname)+'</h3><p class="profile-id">旅页 ID · '+esc(state.user.id)+'</p></div></div><div class="profile-buttons"><button onclick="openPopup(\'profile\')">编辑资料</button><button onclick="copyId()">复制我的 ID</button></div></section><div class="section-head"><h2>我的好友</h2><button class="text-action" onclick="openPopup(\'friend\')">＋ 添加好友</button></div><div class="friend-list">'+friends+'</div><button class="profile-logout" onclick="logout()">退出登录</button></div>');
}
function loginView(){
  return '<section class="phone login"><div class="login-card"><div class="login-symbol">旅</div><div class="eyebrow">START A NEW PAGE</div><h1>从一页旅程开始</h1><p class="login-note">旅页 ID 仅可使用数字和字母，创建后不可修改。已有 ID 将登录，新 ID 将创建账号。</p><form onsubmit="login(event)"><div class="field"><label>旅页 ID</label><input name="username" placeholder="仅限数字和字母" pattern="[A-Za-z0-9]+" title="仅可输入数字和字母" autocomplete="username" required maxlength="20"></div><div class="field"><label>密码</label><input name="password" type="password" placeholder="至少 6 位" autocomplete="current-password" required minlength="6"></div><button class="modal-submit">登录 / 创建账号</button></form><p class="subcopy" style="text-align:center;margin-top:16px;font-size:10px">同一旅页 ID 只能对应一个账号和一组密码</p></div>'+(toast?'<div class="toast login-toast" role="status">'+esc(toast)+'</div>':'')+'</section>';
}
function popupView(){
  var currentAlbum=album();
  if(!currentAlbum&&['upload','invite','person','settings'].indexOf(popup)!==-1){
    return '<div class="modal-mask" onclick="if(event.target===this)closePopup()"><section class="sheet" onclick="event.stopPropagation()"><div class="sheet-head"><h2>暂无可操作的相簿</h2><button class="icon-btn" onclick="closePopup()">×</button></div><div class="empty">请先创建一个相簿，再进行这项操作。</div></section></div>';
  }
  var a=currentAlbum||{id:'',folder:'',categories:['全部'],title:'',description:''};
  var body='';
  var albumPhotos=media.filter(function(m){return m.album===a.id&&!m.video;});
  var coverChoices=albumPhotos.length?albumPhotos.map(function(m){return '<button type="button" class="cover-option '+(pendingCover===m.src?'selected':'')+'" onclick="selectCover(\''+m.id+'\')"><img src="'+m.src+'" alt="可选封面">'+(pendingCover===m.src?'<span>✓</span>':'')+'</button>';}).join(''):'<div class="cover-empty">相簿中还没有照片，上传后即可选择封面</div>';
  var isLibraryCover=albumPhotos.some(function(m){return m.src===pendingCover;});
  var directCoverPreview=pendingCover?'<div class="direct-cover-preview"><img src="'+pendingCover+'" alt="当前相簿封面"><span>'+(isLibraryCover?'相簿照片':'上传图片')+'</span></div>':'';
  var coverSourceMenu=coverMenuOpen?'<div class="cover-source-menu"><button type="button" onclick="showCoverLibrary()"><span>▧</span><b>在相簿中选择</b></button><label><span>↑</span><b>从手机上传</b><input name="coverFile" type="file" accept="image/*" hidden></label></div>':'';
  var coverLibrary=coverLibraryOpen?'<div class="cover-library"><p>相簿中的全部照片</p><div class="cover-picker">'+coverChoices+'</div></div>':'';
  var folderOptions='<option value="" '+(!a.folder?'selected':'')+'>不加入分类</option>'+state.folders.slice(1).map(function(name){return '<option value="'+esc(name)+'" '+(a.folder===name?'selected':'')+'>'+esc(name)+'</option>';}).join('');
  var selectedCreateFolder=state.folder==='全部相簿'?'':state.folder;
  var createFolderOptions='<option value="" '+(!selectedCreateFolder?'selected':'')+'>不加入分类</option>'+state.folders.slice(1).map(function(name){return '<option value="'+esc(name)+'" '+(selectedCreateFolder===name?'selected':'')+'>'+esc(name)+'</option>';}).join('');
  var folderRows=state.folders.slice(1).map(function(name,offset){var index=offset+1;return '<form class="manage-row" data-order-kind="folder" data-order-index="'+index+'" onsubmit="renameFolder(event,\''+index+'\')"><button class="drag-handle" type="button" aria-label="长按拖动调整顺序"><i></i><i></i><i></i></button><input name="newName" value="'+esc(name)+'" maxlength="16" required><button class="mini-button" type="submit">保存</button><button class="mini-button danger" type="button" onclick="deleteFolder(\''+index+'\')">删除</button></form>';}).join('');
  var categoryRows=a.categories.slice(1).map(function(name,offset){var index=offset+1;return '<form class="manage-row" data-order-kind="category" data-order-index="'+index+'" onsubmit="renameCategory(event,\''+index+'\')"><button class="drag-handle" type="button" aria-label="长按拖动调整顺序"><i></i><i></i><i></i></button><input name="newName" value="'+esc(name)+'" maxlength="12" required><button class="mini-button" type="submit">保存</button><button class="mini-button danger" type="button" onclick="deleteCategory(\''+index+'\')">删除</button></form>';}).join('');
  if(popup==='upload')body='<div class="modal-head"><h2>上传共同记忆</h2><button class="close" onclick="closePopup()">×</button></div><form onsubmit="upload(event)"><button class="upload-target" type="button" onclick="picker.click()"><b>⌑</b><span>选择照片或视频</span><em>将以原始文件保存，支持多选</em></button><div id="chosen-files"></div><div class="field" style="margin-top:14px"><label>归入分类（可多选）</label><div class="check-list">'+a.categories.filter(function(p){return p!=='全部';}).map(function(p){return '<label><input type="checkbox" name="people" value="'+esc(p)+'"> '+esc(p)+'</label>';}).join('')+'</div></div><div class="field"><label>拍摄日期</label><input name="date" type="date"></div><button class="modal-submit">上传到相簿</button></form>';
  if(popup==='album')body='<div class="modal-head"><h2>新建相簿</h2><button class="close" onclick="closePopup()">×</button></div><form onsubmit="createAlbum(event)"><div class="field"><label>相簿名称</label><input name="title" placeholder="例如：春天去海边" required></div><div class="field"><label>旅行地点</label><input name="place" placeholder="例如：厦门" required></div><div class="field"><label>个人整理分类</label><select name="folder">'+createFolderOptions+'</select></div><button class="modal-submit">创建相簿</button></form>';
  if(popup==='folder')body='<div class="modal-head"><h2>管理相簿分类</h2><button class="close" onclick="closePopup()">×</button></div><p class="subcopy" style="margin-bottom:14px">分类只在你的主页可见。长按左侧手柄可拖动排序，删除分类不会删除其中的相簿。</p><form onsubmit="createFolder(event)"><div class="field"><label>新分类名称</label><input name="folder" placeholder="例如：2026 年旅行" required></div><button class="modal-submit">添加分类</button></form><div class="manage-title">已有分类</div><div class="manage-list">'+(folderRows||'<p class="cover-empty">还没有自定义分类</p>')+'</div>';
  if(popup==='friend'){var searchResult='';if(pendingFriendProfile){var resultAvatar=pendingFriendProfile.avatarUrl?'<img src="'+pendingFriendProfile.avatarUrl+'" alt="'+esc(pendingFriendProfile.nickname)+'">':esc(pendingFriendProfile.avatar);searchResult='<div class="friend-search-result"><div class="friend-profile-avatar">'+resultAvatar+'</div><div><h3>'+esc(pendingFriendProfile.nickname)+'</h3><p>旅页 ID · '+esc(pendingFriendProfile.id)+'</p></div><button onclick="sendFriendRequest(\''+esc(pendingFriendProfile.id)+'\')">添加</button></div>';}body='<div class="modal-head"><h2>添加好友</h2><button class="close" onclick="closePopup()">×</button></div><p class="subcopy" style="margin-bottom:15px">输入对方的旅页 ID，确认资料后再发送好友申请。</p><form onsubmit="addFriend(event)"><div class="field"><label>对方的旅页 ID</label><input name="id" placeholder="例如：xiaoman91" pattern="[A-Za-z0-9]+" required></div><button class="modal-submit">查找用户</button></form>'+searchResult;}
  if(popup==='invite')body='<div class="modal-head"><h2>邀请同行的人</h2><button class="close" onclick="closePopup()">×</button></div><p class="subcopy" style="margin-bottom:13px">好友会在消息中心收到邀请，同意后加入相簿。</p><div class="friend-list">'+state.friends.map(function(f){return '<div class="friend">'+friendAv(f)+'<div class="friend-info"><b>'+esc(f.remark||f.nickname)+'</b><span>旅页 ID · '+esc(f.id)+'</span></div><button onclick="invite(\''+esc(f.id)+'\')">邀请</button></div>';}).join('')+'</div>';
  if(popup==='person')body='<div class="modal-head"><h2>管理相簿内分类</h2><button class="close" onclick="closePopup()">×</button></div><p class="subcopy" style="margin-bottom:14px">长按左侧手柄可拖动排序。删除分类不会删除照片，只会移除分类关联。</p><form onsubmit="addPerson(event)"><div class="field"><label>分类名称</label><input name="person" placeholder="例如：小安" required></div><button class="modal-submit">添加分类</button></form><div class="manage-title">已有分类</div><div class="manage-list">'+(categoryRows||'<p class="cover-empty">还没有自定义分类</p>')+'</div>';
  if(popup==='profile'){var avatarPreview=pendingAvatar?'<img src="'+pendingAvatar+'" alt="头像预览">':esc(state.user.avatar);body='<div class="modal-head"><h2>编辑个人资料</h2><button class="close" onclick="closePopup()">×</button></div><form onsubmit="updateProfile(event)"><div class="avatar-editor"><div class="profile-avatar avatar-preview">'+avatarPreview+'</div><label class="avatar-upload">选择头像<input name="avatarFile" type="file" accept="image/*" hidden></label></div><div class="field"><label>昵称</label><input name="nickname" value="'+esc(state.user.nickname)+'" required maxlength="12"></div><button class="modal-submit">保存资料</button></form>';}
  if(popup==='friend-card'){var friend=state.friends.find(function(item){return item.id===selectedFriendId;});if(friend){var cardAvatar=friend.avatarUrl?'<img src="'+friend.avatarUrl+'" alt="'+esc(friend.nickname)+'">':esc(friend.avatar);body='<div class="modal-head"><h2>好友资料</h2><button class="close" onclick="closePopup()">×</button></div><div class="friend-profile"><div class="friend-profile-avatar '+esc(friend.color||'')+'">'+cardAvatar+'</div><div><h3>'+esc(friend.nickname)+'</h3><p>旅页 ID · '+esc(friend.id)+'</p></div></div><form onsubmit="saveFriendCard(event)"><div class="field"><label>备注</label><input name="remark" value="'+esc(friend.remark||friend.nickname)+'" placeholder="在你的 App 内显示的名称" maxlength="20"></div><div class="field"><label>描述</label><textarea name="description" placeholder="记录你们共同的故事" maxlength="60">'+esc(friend.description||'')+'</textarea></div><button class="modal-submit">保存好友资料</button></form>';}}
  if(popup==='settings'){var deleteAlbumButton=isCurrentUserId(a.ownerId)?'<button class="danger-action" type="button" onclick="deleteCurrentAlbum()">删除整个相簿</button>':'';body='<div class="modal-head"><h2>相簿设置</h2><button class="close" onclick="closePopup()">×</button></div><form onsubmit="updateAlbum(event)"><div class="field"><label>相簿名称</label><input name="title" value="'+esc(a.title)+'" required></div><div class="field"><label>描述</label><input name="description" value="'+esc(a.description)+'" placeholder="例如：大理 · 2025" maxlength="40"></div><div class="field"><label>封面</label>'+directCoverPreview+'<button class="cover-main-button" type="button" onclick="toggleCoverMenu()">选择封面</button>'+coverSourceMenu+coverLibrary+'</div><div class="field"><label>我的相簿分类（仅自己可见）</label><select name="folder">'+folderOptions+'</select></div><p class="subcopy" style="margin:-4px 0 13px">名称、描述和封面对所有成员生效；相簿分类仅用于自己的整理。</p><button class="modal-submit">保存相簿设置</button>'+deleteAlbumButton+'</form>';}
  if(popup==='messages'){var requestRows=(state.friendRequests||[]).map(function(request){var requestAvatar=accountAv(request.fromId,request.nickname,request.avatar,'a2'),requestProfile=latestUserProfile(request.fromId),requestName=requestProfile&&requestProfile.nickname||request.nickname;return '<div class="friend-request">'+requestAvatar+'<div><b>'+esc(requestName)+'</b><span>旅页 ID · '+esc(request.fromId)+'</span><p>申请添加你为好友</p></div><div class="request-actions"><button onclick="approveFriendRequest(\''+esc(request.fromId)+'\')">同意</button><button class="reject" onclick="rejectFriendRequest(\''+esc(request.fromId)+'\')">拒绝</button></div></div>';}).join('');var albumInviteRows=(state.albumInvites||[]).map(function(invitation){var inviterProfile=latestUserProfile(invitation.fromId),inviterName=inviterProfile&&inviterProfile.nickname||invitation.fromNickname;return '<div class="friend-request album-invite-request">'+accountAv(invitation.fromId,inviterName,inviterName.slice(0,1),'a4')+'<div><b>'+esc(inviterName)+' 邀请你加入相簿</b><span>'+esc(invitation.albumTitle)+'</span><p>同意后即可查看并共同上传记忆</p></div><div class="request-actions"><button onclick="approveAlbumInvite(\''+esc(invitation.inviteId)+'\')">同意</button><button class="reject" onclick="rejectAlbumInvite(\''+esc(invitation.inviteId)+'\')">拒绝</button></div></div>';}).join('');var notificationRows=(state.notifications||[]).map(function(notice){var icon=notice.type==='like'?'♥':notice.type==='comment'?'••':notice.type==='friend'?'✓':'◌',actorId=noticeActorId(notice),actorProfile=latestUserProfile(actorId),actorName=actorProfile&&actorProfile.nickname||notice.actorNickname||'',noticeAvatar=actorId?accountAv(actorId,actorName,actorName.slice(0,1),'a3'):'<span class="notification-icon '+esc(notice.type)+'">'+icon+'</span>';return '<div class="notification-item">'+noticeAvatar+'<div><p>'+esc(notice.text)+'</p><small>'+esc(notice.time||'刚刚')+'</small></div></div>';}).join('');body='<div class="modal-head"><h2>消息</h2><button class="close" onclick="closePopup()">×</button></div><div class="request-list">'+(requestRows+albumInviteRows+notificationRows||'<div class="message-empty">暂时没有新消息</div>')+'</div>';}
  return '<div class="modal-layer" onclick="if(event.target===this)closePopup()"><section class="modal"><div class="modal-handle"></div>'+body+'</section></div>';
}
function viewerItems(){return media.filter(function(m){return m.album===activeAlbum&&(activePerson==='全部'||m.people.indexOf(activePerson)>-1);});}
function detailView(){
  var items=viewerItems();
  var index=items.findIndex(function(x){return x.id===detail;});
  var m=items[index];
  if(!m)return '';
  var ownerCanDelete=album()&&isCurrentUserId(album().ownerId);
  var comments=m.comments.map(function(c,commentIndex){var replyKey=m.id+':'+commentIndex,commenter=latestUserProfile(c[3]),commenterName=commenter&&commenter.nickname||c[0],commentDelete=(ownerCanDelete||c[3]===currentLoginId)&&c[4]?'<button class="comment-delete" onclick="deleteCommentItem(\''+m.id+'\','+commentIndex+')">删除</button>':'';var replies=(c[2]||[]).map(function(reply,replyIndex){var nestedKey=replyKey+':'+replyIndex,replyUser=latestUserProfile(reply[3]),replyName=replyUser&&replyUser.nickname||reply[0],targetName=reply[2]||commenterName,replyDelete=(ownerCanDelete||reply[3]===currentLoginId)&&reply[4]?'<button class="comment-delete" onclick="deleteCommentItem(\''+m.id+'\','+commentIndex+','+replyIndex+')">删除</button>':'';var nestedForm=replyingComment===nestedKey?'<form class="reply-add nested" onsubmit="replyComment(event,\''+nestedKey+'\')"><input name="reply" placeholder="回复 '+esc(replyName)+'…" required maxlength="80" autofocus><button>发送</button></form>':'';return '<div class="comment-reply">'+accountAv(reply[3],replyName,replyName.slice(0,1),'a2')+'<p><b>'+esc(replyName)+'</b><span>回复 '+esc(targetName)+'</span>'+esc(reply[1])+'<button class="reply-button" onclick="openReply(\''+nestedKey+'\')">回复</button>'+replyDelete+'</p></div>'+nestedForm;}).join('');var replyForm=replyingComment===replyKey?'<form class="reply-add" onsubmit="replyComment(event,\''+replyKey+'\')"><input name="reply" placeholder="回复 '+esc(commenterName)+'…" required maxlength="80" autofocus><button>发送</button></form>':'';return '<div class="comment-thread"><div class="comment">'+accountAv(c[3],commenterName,commenterName.slice(0,1),'a2')+'<p><b>'+esc(commenterName)+'</b>'+esc(c[1])+'<button class="reply-button" onclick="openReply(\''+replyKey+'\')">回复</button>'+commentDelete+'</p></div>'+replies+replyForm+'</div>';}).join('');
  function slide(item,current){var element=item.video?'<video class="viewer-media" src="'+item.src+'" '+(current?'controls':'muted preload="metadata"')+' playsinline></video>':'<img class="viewer-media" src="'+item.src+'" alt="旅行照片" draggable="false">';return '<div class="viewer-slide">'+element+'</div>';}
  var mediaTrack=items.length>1?'<div class="viewer-track" data-multiple="1">'+slide(items[(index-1+items.length)%items.length],false)+slide(m,true)+slide(items[(index+1)%items.length],false)+'</div>':'<div class="viewer-track single" data-multiple="0">'+slide(m,true)+'</div>';
  var mediaDelete=(ownerCanDelete||isCurrentUserId(m.byId))?'<button class="danger" onclick="deleteMediaItem(\''+m.id+'\')">删除照片</button>':'';
  return '<section class="viewer-layer"><header class="viewer-top"><button class="viewer-close" onclick="closeDetail()">×</button><span>'+(index+1)+' / '+items.length+'</span><span class="viewer-spacer"></span></header><div class="viewer-stage">'+mediaTrack+'</div><div class="viewer-panel"><div class="viewer-info"><div><b>'+esc(m.by)+' 上传</b><span>'+esc(m.date)+' · '+esc(m.people.join('、'))+'</span></div></div><div class="detail-actions"><button class="'+(m.liked?'liked':'')+'" onclick="like(\''+m.id+'\')">'+(m.liked?'♥ 已赞':'♡ 点赞')+' '+m.likes+'</button><button onclick="downloadOriginal(\''+m.id+'\')">⇩ 下载原图</button>'+mediaDelete+'</div><div class="viewer-comments"><h3 class="comments-title">评论 '+m.comments.length+'</h3>'+(comments||'<p class="subcopy">还没有评论，留下当时的心情吧。</p>')+'<form class="comment-add" onsubmit="comment(event,\''+m.id+'\')"><input name="comment" placeholder="写下你的评论…" required maxlength="80"><button>发送</button></form></div></div></section>';
}
function interactionArguments(command,event){
  var match=String(command||'').match(/\((.*)\)/);
  if(!match)return [];
  var args=[];
  var token=/'([^']*)'|"([^"]*)"|\b(true|false|null|event)\b|(-?\d+(?:\.\d+)?)/g;
  var item;
  while((item=token.exec(match[1]))){
    if(item[1]!==undefined)args.push(item[1]);
    else if(item[2]!==undefined)args.push(item[2]);
    else if(item[3]==='true')args.push(true);
    else if(item[3]==='false')args.push(false);
    else if(item[3]==='null')args.push(null);
    else if(item[3]==='event')args.push(event);
    else args.push(Number(item[4]));
  }
  return args;
}
var interactionHandlers=[
  'go','openAlbum','setFolder','setPerson','openPopup','openDetail','openFriendCard',
  'sendFriendRequest','approveFriendRequest','rejectFriendRequest','approveAlbumInvite',
  'rejectAlbumInvite','deleteFolder','deleteCategory','selectCover','toggleCoverMenu',
  'showCoverLibrary','prevMedia','nextMedia','like','downloadOriginal','openReply',
  'invite','notify','closePopup','closeDetail','copyId','logout','approve','login',
  'createFolder','renameFolder','createAlbum','addFriend','addPerson','renameCategory',
  'updateProfile','saveFriendCard','updateAlbum','upload','comment','replyComment',
  'reviewAlbumMember','deleteCurrentAlbum','deleteMediaItem','deleteCommentItem'
];
function interactionAllowed(name){return interactionHandlers.indexOf(name)!==-1;}
function interactionHandler(name){
  return typeof window[name]==='function'?window[name]:null;
}
function bindCommand(element,attribute,eventName){
  var command=element.getAttribute(attribute)||'';
  if(command.indexOf('if(event.target===this)closePopup()')===0){
    element.removeAttribute(attribute);
    element.addEventListener(eventName,function(event){
      if(event.target===element)closePopup();
    });
    return;
  }
  if(command.indexOf('picker.click')===0){
    element.removeAttribute(attribute);
    element.addEventListener(eventName,function(){picker.click();});
    return;
  }
  var name=(command.match(/^\s*([a-zA-Z_$][\w$]*)\s*\(/)||[])[1];
  if(!name||!interactionAllowed(name))return;
  element.removeAttribute(attribute);
  element.addEventListener(eventName,function(event){
    if(eventName==='submit')event.preventDefault();
    var handler=interactionHandler(name);
    if(handler)handler.apply(element,interactionArguments(command,event));
  });
}
function bindInteractions(){
  document.querySelectorAll('[onclick]').forEach(function(element){
    bindCommand(element,'onclick','click');
  });
  document.querySelectorAll('form[onsubmit]').forEach(function(form){
    bindCommand(form,'onsubmit','submit');
  });
  var avatarInput=document.querySelector('input[name="avatarFile"]');
  if(avatarInput)avatarInput.addEventListener('change',previewAvatar);
  var coverInput=document.querySelector('input[name="coverFile"]');
  if(coverInput)coverInput.addEventListener('change',previewCoverUpload);
  var viewerStage=document.querySelector('.viewer-stage');
  if(viewerStage){var startX=0,startY=0,swiping=false,swipePointer=null,swipeTrack=viewerStage.querySelector('.viewer-track'),multiple=swipeTrack&&swipeTrack.dataset.multiple==='1';viewerStage.addEventListener('pointerdown',function(event){if(!multiple||(event.pointerType==='mouse'&&event.button!==0))return;startX=event.clientX;startY=event.clientY;swiping=true;swipePointer=event.pointerId;swipeTrack.style.transition='none';if(viewerStage.setPointerCapture)viewerStage.setPointerCapture(swipePointer);});viewerStage.addEventListener('pointermove',function(event){if(!swiping||!swipeTrack)return;var deltaX=event.clientX-startX,deltaY=event.clientY-startY;if(Math.abs(deltaY)>Math.abs(deltaX))return;event.preventDefault();swipeTrack.style.transform='translateX(calc(-100% + '+deltaX+'px))';});function finishSwipe(event,cancelled){if(!swiping)return;var delta=(event&&typeof event.clientX==='number')?event.clientX-startX:0;swiping=false;if(!swipeTrack)return;swipeTrack.style.transition='transform .2s cubic-bezier(.22,.7,.3,1)';if(!cancelled&&Math.abs(delta)>45){swipeTrack.style.transform=delta<0?'translateX(-200%)':'translateX(0)';setTimeout(function(){if(delta<0)nextMedia();else prevMedia();},190);}else{swipeTrack.style.transform='translateX(-100%)';}}viewerStage.addEventListener('pointerup',function(event){finishSwipe(event,false);});viewerStage.addEventListener('pointercancel',function(event){finishSwipe(event,true);});}
  bindLongPressReorder();
}
function clearDragArtifacts(){if(activeDragCancel){var cancel=activeDragCancel;activeDragCancel=null;cancel();}document.querySelectorAll('.drag-ghost').forEach(function(item){item.remove();});document.body.classList.remove('is-sorting');}
function render(){
  clearDragArtifacts();
  if(page==='album'&&!album()){page='albums';activePerson='全部';detail='';}
  if(!album()&&['upload','invite','person','settings'].indexOf(popup)!==-1)popup='';
  app.innerHTML=page==='login'?loginView():page==='albums'?albumsView():page==='album'?albumView():profileView();
  bindInteractions();
}
function markupElement(markup,selector){var template=document.createElement('template');template.innerHTML=markup.trim();return template.content.querySelector(selector);}
function patchDetailView(){var current=document.querySelector('.viewer-layer'),next=detail?markupElement(detailView(),'.viewer-layer'):null;if(current&&next)current.replaceWith(next);else if(current&&!next)current.remove();else if(next){var phone=document.querySelector('.phone');if(phone)phone.appendChild(next);else return render();}else return;bindInteractions();updateToastDom();}
function patchAlbumMediaView(){if(page!=='album'||!album())return render();var markup=albumView();['.album-meta','.tabs','.memory-grid'].forEach(function(selector){var current=document.querySelector(selector),next=markupElement(markup,selector);if(current&&next)current.replaceWith(next);});bindInteractions();updateToastDom();}
function go(next){page=next;popup='';detail='';render();}
function openAlbum(id){activeAlbum=id;activePerson='全部';go('album');}
function setFolder(folder){state.folder=folder;save();render();}
function setPerson(person){activePerson=person;patchAlbumMediaView();}
async function openPopup(name){
  if(['upload','invite','person','settings'].indexOf(name)!==-1&&!album()){
    popup='';
    notify('请先创建一个相簿');
    return;
  }
  if(name==='settings'){
    pendingCover=album().cover;
    coverMenuOpen=false;
    coverLibraryOpen=false;
  }
  if(name==='profile')pendingAvatar=state.user.avatarUrl;
  if(name==='friend')pendingFriendProfile=null;
  if(name==='messages'&&currentLoginId){
    if(cloudMode){
      popup=name;
      render();
      try{
        await loadCloudData();
        var unread=state.notifications.filter(function(item){return !item.read;}).map(function(item){return item.id;});
        if(unread.length)await LvyueCloud.rest('notifications','id='+cloudIn(unread),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({read_at:new Date().toISOString()})});
        state.notifications.forEach(function(item){item.read=true;});
      }catch(error){
        notify('消息同步失败，请稍后重试');
      }
    }else{
      var latest=storageGet('lvyue-user-'+currentLoginId);
      if(latest){
        state=JSON.parse(latest);
        state.friendRequests=state.friendRequests||[];
        state.albumInvites=state.albumInvites||[];
        state.notifications=state.notifications||[];
        state.notifications.forEach(function(item){item.read=true;});
        save();
      }
    }
  }
  popup=name;
  render();
}
function closePopup(){popup='';var layer=document.querySelector('.modal-layer');if(layer)layer.remove();else render();}
function openDetail(id){detail=id;patchDetailView();}
function closeDetail(){detail='';replyingComment='';patchDetailView();}
function moveMedia(step){var items=viewerItems(),index=items.findIndex(function(item){return item.id===detail;});if(index<0||items.length<2)return;detail=items[(index+step+items.length)%items.length].id;patchDetailView();}
function prevMedia(){moveMedia(-1);}
function nextMedia(){moveMedia(1);}
function openFriendCard(id){selectedFriendId=id;var friend=state.friends.find(function(item){return item.id===id;});if(friend){var latest=JSON.parse(storageGet('lvyue-user-'+String(id).toLowerCase())||'null');if(latest&&latest.user){friend.nickname=latest.user.nickname;friend.avatar=latest.user.avatar;friend.avatarUrl=latest.user.avatarUrl||'';save();}}popup='friend-card';render();}
async function loadCloudIdentity(user){cloudUserId=user.id;await loadCloudData();currentLoginId=String(state.user.id).toLowerCase();page='albums';render();}
async function bootCloudSession(){if(!cloudMode||!LvyueCloud.session())return;try{var user=await LvyueCloud.currentUser();if(user)await loadCloudIdentity(user);}catch(error){LvyueCloud.logout();page='login';render();}}
async function login(event){
  event.preventDefault();
  var data=new FormData(event.target),username=String(data.get('username')).trim(),password=String(data.get('password')),accountId=username.toLowerCase(),fingerprint=passwordFingerprint(password);
  if(!/^[A-Za-z0-9]+$/.test(username))return notify('旅页 ID 仅可输入数字和字母');
  if(cloudMode){
    notify('正在连接云端…');
    try{
      await LvyueCloud.loginOrRegister(username,password);
      var cloudUser=await LvyueCloud.currentUser();
      if(!cloudUser)throw new Error('无法读取登录状态');
      await loadCloudIdentity(cloudUser);
      notify('登录成功');
    }catch(error){
      var message=String(error&&error.message||'登录失败');
      if(/INVALID_CREDENTIALS|invalid login credentials|密码错误/i.test(message))message='密码错误，无法登录';
      if(/STORAGE_CONFIG_ERROR|STORAGE_BUCKET_INVALID/i.test(message))message='云存储尚未完成配置，请联系管理员';
      if(/travel_id_exists|schema cache|could not find/i.test(message))message='云端数据库尚未完成初始化，请联系管理员';
      notify(message);
    }
    return;
  }
  if(onlinePage)return notify('云端服务加载失败，请刷新页面后重试');
  if(accounts[accountId]){
    if(accounts[accountId].password!==fingerprint)return notify('密码错误，无法登录');
    var savedState=storageGet('lvyue-user-'+accountId);
    state=savedState?JSON.parse(savedState):freshAccountState(accounts[accountId].id);
  }else{
    accounts[accountId]={id:username,password:fingerprint};
    storageSet('lvyue-accounts',JSON.stringify(accounts));
    state=freshAccountState(username);
    storageSet('lvyue-user-'+accountId,JSON.stringify(state));
  }
  state.friendRequests=state.friendRequests||[];state.albumInvites=state.albumInvites||[];state.notifications=state.notifications||[];
  currentLoginId=accountId;storageSet('lvyue-login',accountId);page='albums';render();notify(accounts[accountId].id===username?'欢迎来到旅页':'登录成功');
}
function logout(){if(cloudMode)LvyueCloud.logout();currentLoginId='';cloudUserId='';storageRemove('lvyue-login');page='login';render();}
function copyId(){if(navigator.clipboard)navigator.clipboard.writeText(state.user.id);notify('旅页 ID 已复制');}
async function createFolder(event){event.preventDefault();var name=String(new FormData(event.target).get('folder')).trim();if(state.folders.indexOf(name)>-1)return notify('这个分类已经存在');if(cloudMode){try{var created=await LvyueCloud.rest('album_folders','',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:cloudUserId,name:name,position:state.folders.length-1})}),createdFolder=Array.isArray(created)?created[0]:created;state.folders.push(name);cloudFolders[name]=createdFolder&&createdFolder.id||null;closePopup();render();notify('已添加个人分类');}catch(error){notify(error.message||'添加分类失败');}return;}state.folders.push(name);save();closePopup();notify('已添加个人分类');}
async function renameFolder(event,indexValue){event.preventDefault();var index=Number(indexValue);if(index<=0||index>=state.folders.length)return;var name=String(new FormData(event.target).get('newName')).trim();if(!name)return;if(state.folders.some(function(item,itemIndex){return item===name&&itemIndex!==index;}))return notify('这个分类已经存在');var oldName=state.folders[index];if(cloudMode){try{var folderId=cloudFolders[oldName];await LvyueCloud.rest('album_folders','id=eq.'+folderId,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({name:name})});state.folders[index]=name;state.albums.forEach(function(item){if(item.folder===oldName)item.folder=name;});if(state.folder===oldName)state.folder=name;delete cloudFolders[oldName];cloudFolders[name]=folderId;render();notify('相簿分类名称已修改');queueCloudSync(0);}catch(error){notify(error.message||'修改失败');}return;}state.folders[index]=name;state.albums.forEach(function(item){if(item.folder===oldName)item.folder=name;});if(state.folder===oldName)state.folder=name;save();notify('相簿分类名称已修改');}
async function deleteFolder(indexValue){var index=Number(indexValue);if(index<=0||index>=state.folders.length)return;var removed=state.folders[index];if(cloudMode){try{await LvyueCloud.rest('album_folders','id=eq.'+cloudFolders[removed],{method:'DELETE',headers:{Prefer:'return=minimal'}});state.folders.splice(index,1);state.albums.forEach(function(item){if(item.folder===removed)item.folder='';});if(state.folder===removed)state.folder='全部相簿';delete cloudFolders[removed];render();notify('分类已删除，相簿仍保留在全部相簿');queueCloudSync(0);}catch(error){notify(error.message||'删除失败');}return;}state.folders.splice(index,1);state.albums.forEach(function(item){if(item.folder===removed)item.folder='';});if(state.folder===removed)state.folder='全部相簿';save();notify('分类已删除，相簿仍保留在全部相簿');}
async function createAlbum(event){event.preventDefault();var d=new FormData(event.target),title=String(d.get('title')).trim(),description=d.get('place')+' · 刚刚创建',folderName=String(d.get('folder')||'');if(cloudMode){try{var folderId=folderName&&cloudFolders[folderName];if(folderName&&!folderId)throw new Error('所选分类尚未同步，请关闭弹窗后重试');var newId=await LvyueCloud.rpc('create_album',{album_title:title,album_description:description});if(folderId)await LvyueCloud.call('folders.assignAlbum',{album_id:newId,folder_id:folderId});state.albums.unshift({id:newId,title:title,place:description,description:description,cover:'',folder:folderName,categories:['全部'],count:0,members:[state.user.avatar],memberIds:[currentLoginId],ownerId:currentLoginId});state.folder=folderName||'全部相簿';activeAlbum=newId;activePerson='全部';popup='';page='album';render();notify('新相簿已经创建');queueCloudSync(0);}catch(error){notify(error.message||'创建相簿失败');}return;}var id='album-'+Date.now();state.albums.unshift({id:id,title:title,place:description,description:description,cover:'',folder:folderName,categories:['全部'],count:0,members:[state.user.avatar],memberIds:[currentLoginId],ownerId:currentLoginId});state.folder=folderName||'全部相簿';save();activeAlbum=id;activePerson='全部';popup='';page='album';render();notify('新相簿已经创建');}
async function addFriend(event){event.preventDefault();var id=String(new FormData(event.target).get('id')).trim(),accountId=id.toLowerCase();if(accountId===currentLoginId)return notify('不能添加自己为好友');if(state.friends.some(function(friend){return friend.id.toLowerCase()===accountId;}))return notify('你们已经是好友');if(cloudMode){try{var rows=await LvyueCloud.rest('profiles','travel_id=eq.'+encodeURIComponent(id)+'&select=user_id,travel_id,nickname,avatar_path');if(!rows[0]){pendingFriendProfile=null;return notify('未找到该旅页 ID');}var profile=cloudProfileView(rows[0]);rememberCloudProfiles(rows);pendingFriendProfile={id:profile.id,userId:profile.userId,nickname:profile.nickname,avatar:profile.avatar,avatarUrl:profile.avatarUrl};render();}catch(error){notify(error.message||'查找失败');}return;}accounts=JSON.parse(storageGet('lvyue-accounts')||'{}');if(!accounts[accountId]){pendingFriendProfile=null;return notify('未找到该旅页 ID');}var targetState=JSON.parse(storageGet('lvyue-user-'+accountId)||'null')||freshAccountState(accounts[accountId].id);pendingFriendProfile={id:accounts[accountId].id,nickname:targetState.user.nickname,avatar:targetState.user.avatar,avatarUrl:targetState.user.avatarUrl||''};render();}
async function sendFriendRequest(id){if(cloudMode){try{await LvyueCloud.rpc('send_friend_request',{target_travel_id:id});pendingFriendProfile=null;closePopup();notify('好友申请已发送');}catch(error){notify(/duplicate key/i.test(error.message)?'好友申请已经发送':error.message||'发送失败');}return;}var accountId=String(id).toLowerCase(),targetState=JSON.parse(storageGet('lvyue-user-'+accountId)||'null');if(!targetState)return notify('该账号资料暂不可用');targetState.friendRequests=targetState.friendRequests||[];if(targetState.friendRequests.some(function(request){return request.fromId.toLowerCase()===currentLoginId;}))return notify('好友申请已经发送，请等待确认');targetState.friendRequests.push({requestId:'friend-request-'+Date.now(),type:'friend_request',status:'pending',fromId:state.user.id,nickname:state.user.nickname,avatar:state.user.avatar,avatarUrl:state.user.avatarUrl||'',createdAt:Date.now(),read:false});storageSet('lvyue-user-'+accountId,JSON.stringify(targetState));pendingFriendProfile=null;closePopup();notify('好友申请已发送');}
async function approveFriendRequest(id){var accountId=String(id).toLowerCase(),request=(state.friendRequests||[]).find(function(item){return item.fromId.toLowerCase()===accountId;});if(!request)return;if(cloudMode){try{await LvyueCloud.rpc('respond_friend_request',{request_id:request.requestId,accept_request:true});if(!state.friends.some(function(friend){return friend.id.toLowerCase()===accountId;}))state.friends.push({nickname:request.nickname,id:request.fromId,avatar:request.avatar||request.nickname.slice(0,1),avatarUrl:request.avatarUrl||'',color:'a2',remark:request.nickname,description:'新添加的好友',userId:request.userId});state.friendRequests=state.friendRequests.filter(function(item){return item.fromId.toLowerCase()!==accountId;});render();notify('已添加 '+request.nickname+' 为好友');queueCloudSync(0);}catch(error){notify(error.message||'操作失败');}return;}var senderState=JSON.parse(storageGet('lvyue-user-'+accountId)||'null');if(!state.friends.some(function(friend){return friend.id.toLowerCase()===accountId;}))state.friends.push({nickname:request.nickname,id:request.fromId,avatar:request.avatar||request.nickname.slice(0,1),avatarUrl:request.avatarUrl||'',color:'a2',remark:request.nickname,description:'新添加的好友'});state.friendRequests=state.friendRequests.filter(function(item){return item.fromId.toLowerCase()!==accountId;});save();if(senderState){senderState.friends=senderState.friends||[];senderState.notifications=senderState.notifications||[];if(!senderState.friends.some(function(friend){return friend.id.toLowerCase()===currentLoginId;}))senderState.friends.push({nickname:state.user.nickname,id:state.user.id,avatar:state.user.avatar,avatarUrl:state.user.avatarUrl||'',color:'a3',remark:state.user.nickname,description:'新添加的好友'});senderState.notifications.unshift({id:'notice-'+Date.now(),type:'friend',text:state.user.nickname+' 已同意你的好友申请',time:'刚刚',read:false,actorId:state.user.id,actorNickname:state.user.nickname});storageSet('lvyue-user-'+accountId,JSON.stringify(senderState));}render();notify('已添加 '+request.nickname+' 为好友');}
async function rejectFriendRequest(id){var accountId=String(id).toLowerCase(),request=(state.friendRequests||[]).find(function(item){return item.fromId.toLowerCase()===accountId;});if(cloudMode&&request){try{await LvyueCloud.rpc('respond_friend_request',{request_id:request.requestId,accept_request:false});state.friendRequests=(state.friendRequests||[]).filter(function(item){return item.fromId.toLowerCase()!==accountId;});render();notify('已拒绝好友申请');queueCloudSync(0);}catch(error){notify(error.message||'操作失败');}return;}state.friendRequests=(state.friendRequests||[]).filter(function(item){return item.fromId.toLowerCase()!==accountId;});save();if(request)pushAccountMessage(request.fromId,'friend',state.user.nickname+' 拒绝了你的好友申请',{event:'friend_request_rejected'});render();notify('已拒绝好友申请');}
async function invite(id){var friend=state.friends.find(function(item){return item.id.toLowerCase()===String(id).toLowerCase();});if(cloudMode){if(!friend)return notify('该好友账号暂不可用');try{await LvyueCloud.rpc('invite_album_member',{target_album:album().id,target_user:friend.userId||'',target_travel_id:friend.id});closePopup();notify('相簿邀请已发送');}catch(error){var message=String(error&&error.message||'邀请失败');if(/duplicate key|MEMBERSHIP_EXISTS/i.test(message))message='该好友已在相簿中，或邀请已经发送';notify(message);}return;}var accountId=String(id).toLowerCase(),targetState=JSON.parse(storageGet('lvyue-user-'+accountId)||'null');if(!targetState)return notify('该好友账号暂不可用');var currentAlbum=album();targetState.albumInvites=targetState.albumInvites||[];if(targetState.albumInvites.some(function(item){return item.albumId===currentAlbum.id&&item.fromId.toLowerCase()===currentLoginId;}))return notify('相簿邀请已经发送，请等待对方确认');var snapshot=JSON.parse(JSON.stringify(currentAlbum));snapshot.folder='';snapshot.memberIds=snapshot.memberIds||[currentLoginId];snapshot.ownerId=snapshot.ownerId||currentLoginId;targetState.albumInvites.push({inviteId:'album-invite-'+Date.now(),type:'album_invite',status:'pending',albumId:currentAlbum.id,albumTitle:currentAlbum.title,album:snapshot,fromId:state.user.id,fromNickname:state.user.nickname,createdAt:Date.now(),read:false});storageSet('lvyue-user-'+accountId,JSON.stringify(targetState));closePopup();notify('相簿邀请已发送');}
async function approveAlbumInvite(inviteId){var invitation=(state.albumInvites||[]).find(function(item){return item.inviteId===inviteId;});if(!invitation)return;if(cloudMode){var previousInvites=state.albumInvites.slice(),addedAlbum=null;state.albumInvites=state.albumInvites.filter(function(item){return item.inviteId!==inviteId;});if(invitation.directJoin&&!state.albums.some(function(item){return item.id===invitation.albumId;})){addedAlbum={id:invitation.albumId,title:invitation.albumTitle,place:invitation.albumDescription||'',description:invitation.albumDescription||'',cover:'',coverPath:'',folder:'',count:0,categories:['全部'],members:[String(invitation.fromNickname||invitation.fromId||'好友').slice(0,1),state.user.avatar],memberIds:[invitation.fromId,currentLoginId],ownerId:invitation.fromId};state.albums.unshift(addedAlbum);state.folder='全部相簿';}render();notify('正在处理相簿邀请…');try{var result=await LvyueCloud.rpc('respond_album_invite',{membership_id:inviteId,accept_invite:true});if(result==='owner_review'&&addedAlbum)state.albums=state.albums.filter(function(item){return item!==addedAlbum;});if(result!=='owner_review'&&!state.albums.some(function(item){return item.id===invitation.albumId;})){state.albums.unshift({id:invitation.albumId,title:invitation.albumTitle,place:invitation.albumDescription||'',description:invitation.albumDescription||'',cover:'',coverPath:'',folder:'',count:0,categories:['全部'],members:[String(invitation.fromNickname||invitation.fromId||'好友').slice(0,1),state.user.avatar],memberIds:[invitation.fromId,currentLoginId],ownerId:invitation.fromId});state.folder='全部相簿';}render();notify(result==='owner_review'?'已提交创建者审核':'已加入相簿「'+invitation.albumTitle+'」');}catch(error){state.albumInvites=previousInvites;if(addedAlbum)state.albums=state.albums.filter(function(item){return item!==addedAlbum;});render();notify(error.message||'操作失败');}return;}var joinedAlbum=JSON.parse(JSON.stringify(invitation.album));joinedAlbum.folder='';joinedAlbum.members=joinedAlbum.members||[];joinedAlbum.memberIds=joinedAlbum.memberIds||[];if(joinedAlbum.memberIds.indexOf(currentLoginId)<0){joinedAlbum.memberIds.push(currentLoginId);joinedAlbum.members.push(state.user.avatar);}if(!state.albums.some(function(item){return item.id===joinedAlbum.id;}))state.albums.unshift(joinedAlbum);state.albumInvites=state.albumInvites.filter(function(item){return item.inviteId!==inviteId;});save();var inviterId=invitation.fromId.toLowerCase(),inviterState=JSON.parse(storageGet('lvyue-user-'+inviterId)||'null');if(inviterState){var inviterAlbum=inviterState.albums.find(function(item){return item.id===invitation.albumId;});if(inviterAlbum){inviterAlbum.memberIds=inviterAlbum.memberIds||[inviterId];inviterAlbum.members=inviterAlbum.members||[];if(inviterAlbum.memberIds.indexOf(currentLoginId)<0){inviterAlbum.memberIds.push(currentLoginId);inviterAlbum.members.push(state.user.avatar);}}inviterState.notifications=inviterState.notifications||[];inviterState.notifications.unshift({id:'notice-'+Date.now(),type:'album',text:state.user.nickname+' 已加入相簿「'+invitation.albumTitle+'」',time:'刚刚',read:false,actorId:state.user.id,actorNickname:state.user.nickname});storageSet('lvyue-user-'+inviterId,JSON.stringify(inviterState));}render();notify('已加入相簿「'+invitation.albumTitle+'」');}
async function rejectAlbumInvite(inviteId){var invitation=(state.albumInvites||[]).find(function(item){return item.inviteId===inviteId;});if(!invitation)return;if(cloudMode){try{await LvyueCloud.rpc('respond_album_invite',{membership_id:inviteId,accept_invite:false});state.albumInvites=state.albumInvites.filter(function(item){return item.inviteId!==inviteId;});render();notify('已拒绝相簿邀请');queueCloudSync(0);}catch(error){notify(error.message||'操作失败');}return;}state.albumInvites=state.albumInvites.filter(function(item){return item.inviteId!==inviteId;});save();pushAccountMessage(invitation.fromId,'album',state.user.nickname+' 拒绝了相簿「'+invitation.albumTitle+'」的邀请');render();notify('已拒绝相簿邀请');}
function approve(){closePopup();notify('已同意小满加入相簿');}
async function addPerson(event){event.preventDefault();var name=String(new FormData(event.target).get('person')).trim(),currentAlbum=album();if(currentAlbum.categories.indexOf(name)>-1)return notify('这个分类已经存在');if(cloudMode){try{var created=await LvyueCloud.rest('album_categories','',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({album_id:currentAlbum.id,name:name,position:currentAlbum.categories.length-1,created_by:cloudUserId})}),createdCategory=Array.isArray(created)?created[0]:created;currentAlbum.categories.push(name);cloudCategories[currentAlbum.id]=cloudCategories[currentAlbum.id]||{};if(createdCategory&&createdCategory.id)cloudCategories[currentAlbum.id][name]=createdCategory.id;closePopup();render();notify('已新增「'+name+'」分类');queueCloudSync(0);}catch(error){notify(error.message||'添加分类失败');}return;}currentAlbum.categories.push(name);save();notifyAlbumMembers(currentAlbum,'album',state.user.nickname+' 在相簿「'+currentAlbum.title+'」新增了分类「'+name+'」',{event:'album_category_created'});closePopup();notify('已新增「'+name+'」分类');}
async function renameCategory(event,indexValue){event.preventDefault();var index=Number(indexValue),currentAlbum=album(),categories=currentAlbum.categories;if(index<=0||index>=categories.length)return;var name=String(new FormData(event.target).get('newName')).trim();if(!name)return;if(categories.some(function(item,itemIndex){return item===name&&itemIndex!==index;}))return notify('这个分类已经存在');var oldName=categories[index];if(cloudMode){try{var categoryMap=cloudCategories[currentAlbum.id]||{},categoryId=categoryMap[oldName];if(!categoryId)throw new Error('分类数据尚未同步，请稍后重试');await LvyueCloud.rest('album_categories','id=eq.'+categoryId,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({name:name})});categories[index]=name;media.forEach(function(item){if(item.album===activeAlbum)item.people=item.people.map(function(label){return label===oldName?name:label;});});if(activePerson===oldName)activePerson=name;delete categoryMap[oldName];categoryMap[name]=categoryId;render();notify('相簿内分类名称已修改');queueCloudSync(0);}catch(error){notify(error.message||'修改失败');}return;}categories[index]=name;media.forEach(function(item){if(item.album===activeAlbum)item.people=item.people.map(function(label){return label===oldName?name:label;});});if(activePerson===oldName)activePerson=name;save();notifyAlbumMembers(currentAlbum,'album',state.user.nickname+' 将分类「'+oldName+'」修改为「'+name+'」',{event:'album_category_renamed'});notify('相簿内分类名称已修改');}
async function deleteCategory(indexValue){var index=Number(indexValue),currentAlbum=album(),categories=currentAlbum.categories;if(index<=0||index>=categories.length)return;var removed=categories[index];if(cloudMode){try{var categoryMap=cloudCategories[currentAlbum.id]||{},categoryId=categoryMap[removed];if(!categoryId)throw new Error('分类数据尚未同步，请稍后重试');await LvyueCloud.rest('album_categories','id=eq.'+categoryId,{method:'DELETE',headers:{Prefer:'return=minimal'}});categories.splice(index,1);media.forEach(function(item){if(item.album===activeAlbum)item.people=item.people.filter(function(label){return label!==removed;});});if(activePerson===removed)activePerson='全部';delete categoryMap[removed];render();notify('分类已删除，照片仍保留在全部');queueCloudSync(0);}catch(error){notify(error.message||'删除失败');}return;}categories.splice(index,1);media.forEach(function(item){if(item.album===activeAlbum)item.people=item.people.filter(function(label){return label!==removed;});});if(activePerson===removed)activePerson='全部';save();notifyAlbumMembers(currentAlbum,'album',state.user.nickname+' 删除了相簿分类「'+removed+'」',{event:'album_category_deleted'});notify('分类已删除，照片仍保留在全部');}
function bindLongPressReorder(){document.querySelectorAll('.drag-handle').forEach(function(handle){var row=handle.closest('.manage-row'),timer=null,active=false,pointerId=null,pressY=0,grabOffset=0,ghost=null,list=null;function removeWindowListeners(){window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);window.removeEventListener('blur',finish);}function cleanup(){clearTimeout(timer);timer=null;removeWindowListeners();if(ghost){ghost.remove();ghost=null;}if(row)row.classList.remove('drag-placeholder');document.body.classList.remove('is-sorting');active=false;}function start(event){if(event.pointerType==='mouse'&&event.button!==0)return;if(activeDragCancel)activeDragCancel();pointerId=event.pointerId;pressY=event.clientY;list=row.parentElement;activeDragCancel=cleanup;window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);window.addEventListener('blur',finish);timer=setTimeout(function(){if(!row.isConnected)return cleanup();var rect=row.getBoundingClientRect();active=true;grabOffset=pressY-rect.top;ghost=row.cloneNode(true);ghost.classList.add('drag-ghost');ghost.style.left=rect.left+'px';ghost.style.top=rect.top+'px';ghost.style.width=rect.width+'px';ghost.style.height=rect.height+'px';document.body.appendChild(ghost);row.classList.add('drag-placeholder');document.body.classList.add('is-sorting');if(handle.setPointerCapture)handle.setPointerCapture(pointerId);if(navigator.vibrate)navigator.vibrate(25);},380);}function move(event){if(!active){if(Math.abs(event.clientY-pressY)>10){clearTimeout(timer);timer=null;}return;}event.preventDefault();var listRect=list.getBoundingClientRect(),ghostHeight=ghost?ghost.getBoundingClientRect().height:0,minTop=listRect.top,maxTop=Math.max(minTop,listRect.bottom-ghostHeight),top=Math.max(minTop,Math.min(event.clientY-grabOffset,maxTop)),effectiveY=Math.max(listRect.top,Math.min(event.clientY,listRect.bottom));if(ghost)ghost.style.top=top+'px';var siblings=Array.from(list.querySelectorAll('.manage-row')).filter(function(item){return item!==row;});var before=siblings.find(function(item){var rect=item.getBoundingClientRect();return effectiveY<rect.top+rect.height/2;});if(before)list.insertBefore(row,before);else list.appendChild(row);}function finish(){var shouldCommit=active,container=row&&row.parentElement;cleanup();if(activeDragCancel===cleanup)activeDragCancel=null;if(!shouldCommit||!container)return;var rows=Array.from(container.querySelectorAll('.manage-row'));var indexes=rows.map(function(item){return Number(item.dataset.orderIndex);}),kind=row.dataset.orderKind,names;if(kind==='folder'){var oldFolders=state.folders.slice();names=indexes.map(function(index){return oldFolders[index];});state.folders=['全部相簿'].concat(names);}else{var oldCategories=album().categories.slice();names=indexes.map(function(index){return oldCategories[index];});album().categories=['全部'].concat(names);}save();render();if(cloudMode)persistCloudOrder(kind,names).then(function(){notify('分类顺序已调整');}).catch(function(){notify('顺序保存失败，请重试');});else notify('分类顺序已调整');}handle.addEventListener('pointerdown',start);handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);handle.addEventListener('contextmenu',function(event){event.preventDefault();});});}
function previewAvatar(event){var file=event.target.files&&event.target.files[0];if(!file)return;if(!file.type.startsWith('image/'))return notify('请选择图片文件');if(file.size>5*1024*1024)return notify('头像图片不能超过 5MB');var reader=new FileReader();reader.onload=function(){pendingAvatar=reader.result;render();};reader.readAsDataURL(file);}
async function updateProfile(event){event.preventDefault();var d=new FormData(event.target),nickname=String(d.get('nickname')).trim();if(cloudMode){try{if(/^data:/.test(pendingAvatar)){var avatarBlob=await fetch(pendingAvatar).then(function(response){return response.blob();}),avatarExt=(avatarBlob.type.split('/')[1]||'jpg').replace('jpeg','jpg'),avatarFile=new File([avatarBlob],'avatar-'+Date.now()+'.'+avatarExt,{type:avatarBlob.type||'image/jpeg'});await LvyueCloud.uploadFile('avatar',null,avatarFile,[]);}await LvyueCloud.call('profile.update',{nickname:nickname});state.user.nickname=nickname;state.user.avatar=nickname.slice(0,1).toUpperCase();if(pendingAvatar)state.user.avatarUrl=pendingAvatar;closePopup();render();notify('个人资料已保存');queueCloudSync(0);}catch(error){notify(error.message||'资料保存失败');}return;}state.user.nickname=nickname;state.user.avatar=state.user.nickname.slice(0,1).toUpperCase();state.user.avatarUrl=pendingAvatar;save();closePopup();notify('个人资料已保存');}
async function saveFriendCard(event){event.preventDefault();var friend=state.friends.find(function(item){return item.id===selectedFriendId;});if(!friend)return;var data=new FormData(event.target),remark=String(data.get('remark')).trim()||friend.nickname,description=String(data.get('description')).trim();if(cloudMode){try{await LvyueCloud.rest('friend_details','',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({owner_id:cloudUserId,friend_id:friend.userId,remark:remark,description:description})});friend.remark=remark;friend.description=description;closePopup();render();notify('好友资料已保存');queueCloudSync(0);}catch(error){notify(error.message||'保存失败');}return;}friend.remark=remark;friend.description=description;save();closePopup();notify('好友资料已保存');}
function toggleCoverMenu(){coverMenuOpen=!coverMenuOpen;if(!coverMenuOpen)coverLibraryOpen=false;render();}
function showCoverLibrary(){coverLibraryOpen=true;render();}
function selectCover(id){var chosen=media.filter(function(m){return m.id===id&&m.album===activeAlbum&&!m.video;})[0];if(chosen){pendingCover=chosen.src;coverMenuOpen=false;coverLibraryOpen=false;render();}}
function previewCoverUpload(event){var file=event.target.files&&event.target.files[0];if(!file)return;if(!file.type.startsWith('image/'))return notify('请选择图片文件');if(file.size>10*1024*1024)return notify('封面图片不能超过 10MB');var reader=new FileReader();reader.onload=function(){pendingCover=reader.result;coverMenuOpen=false;coverLibraryOpen=false;render();};reader.readAsDataURL(file);}
function downloadOriginal(id){var item=media.find(function(m){return m.id===id;});if(!item)return;var extension=item.video?'mp4':'jpg';var filename='旅页-'+String(item.date||'旅行记忆').replace(/[^0-9A-Za-z\u4e00-\u9fa5-]/g,'-')+'.'+extension;notify('正在下载原图…');function saveUrl(url){var link=document.createElement('a');link.href=url;link.download=filename;link.style.display='none';document.body.appendChild(link);link.click();link.remove();}if(/^data:|^blob:/.test(item.src)){saveUrl(item.src);return;}fetch(item.src).then(function(response){if(!response.ok)throw new Error('download');return response.blob();}).then(function(blob){var url=URL.createObjectURL(blob);saveUrl(url);setTimeout(function(){URL.revokeObjectURL(url);},1000);}).catch(function(){var fallback=document.createElement('a');fallback.href=item.src;fallback.target='_blank';fallback.rel='noopener';document.body.appendChild(fallback);fallback.click();fallback.remove();notify('已打开原图，请长按保存到手机');});}
async function updateAlbum(event){event.preventDefault();var d=new FormData(event.target),currentAlbum=album(),oldTitle=currentAlbum.title,newTitle=String(d.get('title')).trim(),newDescription=String(d.get('description')||'').trim(),newFolder=String(d.get('folder')||'');if(cloudMode){try{await LvyueCloud.call('albums.update',{album_id:currentAlbum.id,title:newTitle,description:newDescription});var selectedMedia=media.find(function(item){return item.album===currentAlbum.id&&item.src===pendingCover;});if(selectedMedia)await LvyueCloud.call('media.useAsCover',{media_id:selectedMedia.id});else if(/^data:/.test(pendingCover)){var coverBlob=await fetch(pendingCover).then(function(response){return response.blob();}),coverExt=(coverBlob.type.split('/')[1]||'jpg').replace('jpeg','jpg'),coverFile=new File([coverBlob],'cover-'+Date.now()+'.'+coverExt,{type:coverBlob.type||'image/jpeg'});await LvyueCloud.uploadFile('cover',currentAlbum.id,coverFile,[]);}await LvyueCloud.call('folders.assignAlbum',{album_id:currentAlbum.id,folder_id:newFolder&&cloudFolders[newFolder]?cloudFolders[newFolder]:null});currentAlbum.title=newTitle;currentAlbum.description=newDescription;currentAlbum.cover=pendingCover;currentAlbum.folder=newFolder;closePopup();render();notify('相簿设置已保存');queueCloudSync(0);}catch(error){notify(error.message||'相簿设置保存失败');}return;}currentAlbum.title=newTitle;currentAlbum.description=newDescription;currentAlbum.cover=pendingCover;currentAlbum.folder=newFolder;save();notifyAlbumMembers(currentAlbum,'album',state.user.nickname+' 更新了相簿「'+oldTitle+'」的资料',{event:'album_updated'});closePopup();notify('相簿设置已保存');}
async function deleteCurrentAlbum(){var currentAlbum=album();if(!currentAlbum)return;if(!window.confirm('确定删除整个相簿「'+currentAlbum.title+'」吗？其中的照片、评论和成员记录都会永久删除。'))return;try{if(cloudMode)await LvyueCloud.call('albums.delete',{album_id:currentAlbum.id});state.albums=state.albums.filter(function(item){return item.id!==currentAlbum.id;});media=media.filter(function(item){return item.album!==currentAlbum.id;});delete cloudCategories[currentAlbum.id];activeAlbum='';activePerson='全部';detail='';popup='';page='albums';save();render();notify('相簿已删除');}catch(error){notify(error.message||'相簿删除失败');}}
async function deleteMediaItem(id){var item=media.find(function(entry){return entry.id===id;}),currentAlbum=album();if(!item||!currentAlbum)return;if(!window.confirm('确定删除这张'+(item.video?'视频':'照片')+'吗？相关评论也会永久删除。'))return;try{if(cloudMode)await LvyueCloud.call('media.delete',{media_id:id});media=media.filter(function(entry){return entry.id!==id;});currentAlbum.count=Math.max(0,Number(currentAlbum.count||0)-1);if(currentAlbum.coverPath&&currentAlbum.coverPath===item.storagePath){currentAlbum.cover='';currentAlbum.coverPath='';}detail='';replyingComment='';save();patchDetailView();patchAlbumMediaView();notify(item.video?'视频已删除':'照片已删除');}catch(error){notify(error.message||'删除失败');}}
async function deleteCommentItem(mediaId,commentIndex,replyIndex){var item=media.find(function(entry){return entry.id===mediaId;}),thread=item&&item.comments[Number(commentIndex)],isReply=replyIndex!==undefined&&replyIndex!==null,target=isReply&&thread&&thread[2]&&thread[2][Number(replyIndex)]||thread;if(!target)return;if(!window.confirm('确定删除这条评论吗？'))return;try{if(cloudMode){if(!target[4]||String(target[4]).indexOf('pending-')===0)throw new Error('评论仍在发送，请稍后再试');await LvyueCloud.call('comments.delete',{comment_id:target[4]});}if(isReply)thread[2].splice(Number(replyIndex),1);else item.comments.splice(Number(commentIndex),1);replyingComment='';save();patchDetailView();notify('评论已删除');}catch(error){notify(error.message||'评论删除失败');}}
async function like(id){var m=media.find(function(x){return x.id===id;});if(!m)return;var wasLiked=Boolean(m.liked);m.liked=!wasLiked;m.likes=Math.max(0,Number(m.likes||0)+(m.liked?1:-1));patchDetailView();if(cloudMode){try{if(wasLiked)await LvyueCloud.rest('media_likes','media_id=eq.'+id+'&user_id=eq.'+cloudUserId,{method:'DELETE',headers:{Prefer:'return=minimal'}});else await LvyueCloud.rest('media_likes','',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({media_id:id,user_id:cloudUserId})});}catch(error){m.liked=wasLiked;m.likes=Math.max(0,Number(m.likes||0)+(wasLiked?1:-1));patchDetailView();notify(error.message||'点赞失败');}return;}if(m.liked&&m.byId)pushAccountMessage(m.byId,'like',state.user.nickname+' 赞了你的照片',{event:'media_liked',mediaId:m.id,albumId:m.album});save();patchDetailView();}
async function comment(event,id){event.preventDefault();var text=String(new FormData(event.target).get('comment')).trim();if(!text)return;var item=media.find(function(x){return x.id===id;});if(!item)return;item.comments=item.comments||[];var optimistic=[state.user.nickname,text,[],currentLoginId,'pending-'+Date.now()];item.comments.push(optimistic);patchDetailView();if(cloudMode){try{var created=await LvyueCloud.call('comments.create',{media_id:id,body:text});optimistic[4]=created&&created.id||optimistic[4];}catch(error){var failedIndex=item.comments.indexOf(optimistic);if(failedIndex>-1)item.comments.splice(failedIndex,1);patchDetailView();notify(error.message||'评论发送失败');}return;}if(item.byId)pushAccountMessage(item.byId,'comment',state.user.nickname+' 评论了你的照片：“'+text+'”',{event:'media_commented',mediaId:item.id,albumId:item.album});save();}
function openReply(key){replyingComment=replyingComment===key?'':key;patchDetailView();setTimeout(function(){var input=document.querySelector('.reply-add input');if(input)input.focus();},0);}
async function replyComment(event,key){event.preventDefault();var parts=key.split(':');var item=media.find(function(x){return x.id===parts[0];});var index=Number(parts[1]);var text=String(new FormData(event.target).get('reply')).trim();if(!item||!item.comments[index]||!text)return;var parent=item.comments[index];parent[2]=parent[2]||[];var targetName=parent[0],targetId=parent[3]||item.byId,parentCommentId=parent[4];if(parts.length>2&&parent[2][Number(parts[2])]){var targetReply=parent[2][Number(parts[2])];targetName=targetReply[0];targetId=targetReply[3]||targetId;parentCommentId=targetReply[4]||parentCommentId;}if(cloudMode&&!parentCommentId)return notify('评论数据尚未同步，请稍后重试');var optimistic=[state.user.nickname,text,targetName,currentLoginId,'pending-'+Date.now()];parent[2].push(optimistic);replyingComment='';patchDetailView();if(cloudMode){try{var created=await LvyueCloud.call('comments.create',{media_id:item.id,parent_id:parentCommentId,body:text});optimistic[4]=created&&created.id||optimistic[4];}catch(error){var failedIndex=parent[2].indexOf(optimistic);if(failedIndex>-1)parent[2].splice(failedIndex,1);patchDetailView();notify(error.message||'回复发送失败');}return;}if(targetId)pushAccountMessage(targetId,'comment',state.user.nickname+' 回复了你的评论：“'+text+'”',{event:'comment_replied',mediaId:item.id,albumId:item.album});save();}
picker.addEventListener('change',function(event){selectedFiles=Array.from(event.target.files);var target=document.getElementById('chosen-files');if(target)target.innerHTML=selectedFiles.map(function(f){return '<div class="chosen-file">✓ '+esc(f.name)+'</div>';}).join('');});
document.addEventListener('keydown',function(event){if(!detail)return;if(event.key==='ArrowLeft')prevMedia();if(event.key==='ArrowRight')nextMedia();if(event.key==='Escape')closeDetail();});
async function upload(event){event.preventDefault();if(!selectedFiles.length)return notify('请先选择照片或视频');var d=new FormData(event.target),people=d.getAll('people'),capturedAt=d.get('date')||null,currentAlbum=album(),uploadCount=selectedFiles.length;if(cloudMode){try{var filesToUpload=selectedFiles.slice(),categoryIds=people.map(function(name){return cloudCategories[currentAlbum.id]&&cloudCategories[currentAlbum.id][name];}).filter(Boolean);for(var index=0;index<filesToUpload.length;index++){var file=filesToUpload[index];notify('正在上传 '+(index+1)+' / '+uploadCount);var created=await LvyueCloud.uploadFile('media',currentAlbum.id,file,categoryIds,capturedAt);var localUrl=URL.createObjectURL(file),newItem={id:created.id,album:created.album_id||currentAlbum.id,src:localUrl,storagePath:created.storage_path,people:people.slice(),by:state.user.nickname,byId:currentLoginId,uploaderUserId:cloudUserId,date:created.captured_at||capturedAt&&String(capturedAt).replaceAll('-','.')||'刚刚',likes:0,liked:false,shape:'medium',comments:[],video:created.media_type==='video'||file.type.indexOf('video')===0,originalName:created.original_name||file.name,mimeType:created.mime_type||file.type,byteSize:created.byte_size||file.size};media.unshift(newItem);currentAlbum.count=Number(currentAlbum.count||0)+1;patchAlbumMediaView();(function(item,blobUrl){LvyueCloud.mediaUrl(item.id).then(function(url){if(url){item.src=url;if(currentAlbum.coverPath&&currentAlbum.coverPath===item.storagePath)currentAlbum.cover=url;patchAlbumMediaView();}URL.revokeObjectURL(blobUrl);}).catch(function(){/* Keep the local preview for this session. */});})(newItem,localUrl);}selectedFiles=[];picker.value='';closePopup();patchAlbumMediaView();notify('已上传到共同相簿');}catch(error){notify(error.message||'上传失败，请检查网络后重试');}return;}selectedFiles.forEach(function(file,index){media.unshift({id:'upload-'+Date.now()+'-'+index,album:activeAlbum,src:URL.createObjectURL(file),people:people.length?people:[state.user.nickname],by:state.user.nickname,byId:currentLoginId,date:capturedAt?String(capturedAt).replaceAll('-','.'):'刚刚',likes:0,shape:index%2?'medium':'tall',comments:[],video:file.type.indexOf('video')===0});currentAlbum.count++;});save();notifyAlbumMembers(currentAlbum,'album',state.user.nickname+' 在相簿「'+currentAlbum.title+'」上传了 '+uploadCount+' 个新片段',{event:'media_uploaded'});selectedFiles=[];picker.value='';closePopup();patchAlbumMediaView();notify('已上传到共同相簿');}
render();
bootCloudSession();
