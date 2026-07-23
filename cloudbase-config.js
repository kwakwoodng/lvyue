(function () {
  'use strict';
  function runtimeValue(value) {
    var text = String(value || '').trim();
    return /^%VITE_[A-Z0-9_]+%$/.test(text) ? '' : text;
  }
  var runtimeKey = runtimeValue(window.__LVYUE_CLOUDBASE_ACCESS_KEY__);
  try { runtimeKey = runtimeKey || localStorage.getItem('lvyue-cloudbase-access-key') || ''; } catch (error) {}
  window.LVYUE_CLOUDBASE = Object.freeze({
    env: runtimeValue(window.__LVYUE_CLOUDBASE_ENV_ID__) || 'lvyue-d6gyatb4a502c0235',
    region: runtimeValue(window.__LVYUE_CLOUDBASE_REGION__) || 'ap-shanghai',
    functionName: 'lvyue-api',
    // The HTTP gateway route is public at the transport layer; all user and
    // album permissions are still enforced inside lvyue-api with app tokens.
    httpEndpoint: 'https://lvyue-d6gyatb4a502c0235-1329666616.ap-shanghai.app.tcloudbase.com/lvyue-api',
    // 部署时由构建环境注入 Publishable Key；不要在这里放 SecretId/SecretKey。
    accessKey: runtimeKey || 'VITE_CLOUDBASE_ACCESS_KEY'
  });
})();
