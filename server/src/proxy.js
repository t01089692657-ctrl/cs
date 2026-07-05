/* ============ 出海请求代理 ============
 * 若配置了 OUTBOUND_PROXY，则让所有 fetch（获客抓取、找邮箱、大模型等海外 API）
 * 走该代理。用于服务器（如境内 Mac mini）本身无法直连 Google/LinkedIn/海外 API 的场景。
 * 不配置则默认直连，行为不变。
 */
'use strict';
var cfg = require('./config');

module.exports = function initProxy() {
  if (!cfg.outboundProxy) return;
  try {
    var undici = require('undici');
    undici.setGlobalDispatcher(new undici.ProxyAgent(cfg.outboundProxy));
    console.log('[proxy] 海外请求将经由代理:', cfg.outboundProxy);
  } catch (e) {
    console.warn('[proxy] 代理初始化失败（请确认已 npm install，含 undici）:', e.message);
  }
};
