(function () {
  'use strict';

  var originalPopupView = window.popupView;
  if (typeof originalPopupView === 'function') {
    window.popupView = function () {
      var html = originalPopupView();
      if (window.popup !== 'messages' || !window.cloudMode || !window.state) return html;
      var reviews = window.state.albumReviews || [];
      if (!reviews.length) return html;
      var rows = reviews.map(function (review) {
        var profile = window.latestUserProfile(review.travelId);
        var name = profile && profile.nickname || review.nickname || review.travelId;
        var avatar = window.accountAv(review.travelId, name, String(name || '?').slice(0, 1), 'a4');
        return '<div class="friend-request album-review-request">' + avatar +
          '<div><b>' + window.esc(name) + ' 申请加入相簿</b><span>' + window.esc(review.albumTitle) +
          '</span><p>由普通成员邀请，需要创建者审核</p></div>' +
          '<div class="request-actions"><button onclick="reviewAlbumMember(\'' + window.esc(review.membershipId) +
          '\',true)">同意</button><button class="reject" onclick="reviewAlbumMember(\'' +
          window.esc(review.membershipId) + '\',false)">拒绝</button></div></div>';
      }).join('');
      return html.replace('<div class="request-list">', '<div class="request-list">' + rows);
    };
  }

  window.reviewAlbumMember = async function (membershipId, approve) {
    if (!window.cloudMode) return;
    try {
      await window.LvyueCloud.call('albums.review.respond', { membership_id: membershipId, approve: Boolean(approve) });
      await window.loadCloudData();
      window.render();
      window.notify(approve ? '已同意该成员加入相簿' : '已拒绝该成员加入相簿');
    } catch (error) {
      window.notify(error.message || '审核失败，请稍后重试');
    }
  };
})();
