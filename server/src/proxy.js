/* ============ 出海请求代理 ============
 * 若配置了 OUTBOUND_PROXY，则让海外 API 请求（获客抓取/找邮箱/大模型）走代理，
 * 但【本机与内网地址自动旁路】（如自建 Crawl4AI），避免把内网请求也塞进出海代理导致失败。
 * 不配置则默认直连，行为不变。
 */
'use strict';
var cfg = require('./config');

// 从 CRAWL4AI_URL 解析出主机名，加入旁路名单（docker 下常是 crawl4ai）
function crawlHost() {
  try { return new URL(cfg.crawl.crawl4aiUrl).hostname; } catch (e) { return ''; }
}

module.exports = function initProxy() {
  if (!cfg.outboundProxy) return;
  try {
    var undici = require('undici');
    // 组装 NO_PROXY：本机 + 常见内网段 + 自建抓取主机
    var noProxy = ['localhost', '127.0.0.1', '::1', '10.', '172.16.', '192.168.', 'host.docker.internal', 'crawl4ai'];
    var ch = crawlHost();
    if (ch && noProxy.indexOf(ch) < 0) noProxy.push(ch);

    if (typeof undici.EnvHttpProxyAgent === 'function') {
      // EnvHttpProxyAgent 读取 HTTP_PROXY/HTTPS_PROXY/NO_PROXY，天然支持旁路
      process.env.HTTP_PROXY = process.env.HTTP_PROXY || cfg.outboundProxy;
      process.env.HTTPS_PROXY = process.env.HTTPS_PROXY || cfg.outboundProxy;
      process.env.NO_PROXY = process.env.NO_PROXY || noProxy.join(',');
      undici.setGlobalDispatcher(new undici.EnvHttpProxyAgent());
      console.log('[proxy] 海外请求经代理:', cfg.outboundProxy, '（内网/本机旁路:', process.env.NO_PROXY, '）');
    } else {
      // 老版本 undici 无 EnvHttpProxyAgent：退回 ProxyAgent（无旁路，仅原生部署时用本机代理才安全）
      undici.setGlobalDispatcher(new undici.ProxyAgent(cfg.outboundProxy));
      console.warn('[proxy] 当前 undici 无内网旁路能力，已全局走代理:', cfg.outboundProxy);
    }
  } catch (e) {
    console.warn('[proxy] 代理初始化失败（请确认已 npm install，含 undici）:', e.message);
  }
};
