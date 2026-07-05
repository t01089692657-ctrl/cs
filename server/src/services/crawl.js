/* ============ 网页抓取服务（Crawl4AI 自建 + Firecrawl 兜底） ============
 * live：优先 Crawl4AI（自建、便宜、跑大批量），失败或未配则用 Firecrawl（反爬强）。
 * demo：无抓取配置时返回合成页面文本，保证获客流程能跑通。
 * 返回：{ url, markdown, ok, engine }
 */
'use strict';
var cfg = require('../config');

async function scrape(url) {
  if (cfg.crawl.crawl4aiUrl) {
    try {
      var md = await crawl4ai(url);
      if (md) return { url: url, markdown: md, ok: true, engine: 'crawl4ai' };
    } catch (e) { console.warn('[crawl] crawl4ai 失败，尝试 firecrawl:', e.message); }
  }
  if (cfg.crawl.firecrawlKey) {
    try {
      var md2 = await firecrawl(url);
      if (md2) return { url: url, markdown: md2, ok: true, engine: 'firecrawl' };
    } catch (e) { console.warn('[crawl] firecrawl 失败:', e.message); }
  }
  return { url: url, markdown: demoPage(url), ok: false, engine: 'demo' };
}

async function crawl4ai(url) {
  // Crawl4AI 自建服务（docker 部署，默认 11235 端口）REST 接口
  var res = await fetch(cfg.crawl.crawl4aiUrl.replace(/\/$/, '') + '/crawl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls: [url], extraction_type: 'markdown' })
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var data = await res.json();
  var r = (data.results && data.results[0]) || data;
  return (r.markdown && (r.markdown.raw_markdown || r.markdown)) || r.cleaned_html || '';
}

async function firecrawl(url) {
  var res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.crawl.firecrawlKey },
    body: JSON.stringify({ url: url, formats: ['markdown'] })
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var data = await res.json();
  return (data.data && data.data.markdown) || '';
}

function demoPage(url) {
  return '# ' + url + '\n\n(演示模式：未接入抓取引擎，返回合成页面。部署后填 CRAWL4AI_URL 或 FIRECRAWL_API_KEY 即真实抓取。)\n' +
    'Contact: info@' + url.replace(/^https?:\/\//, '').replace(/\/.*$/, '') + '\n';
}

module.exports = { scrape: scrape };
