/* ============ 找公司服务（搜索 + 海关数据） ============
 * live：SerpAPI 按关键词+国家搜，返回候选公司官网；（海关数据 provider 可扩展）。
 * demo：无 key 时按关键词+国家合成候选公司，保证获客流程能跑通。
 * 返回：[{ company, website, country, channel }]
 */
'use strict';
var cfg = require('../config');

var COUNTRY_EN = {
  '美国': 'USA', '加拿大': 'Canada', '澳大利亚': 'Australia', '新西兰': 'New Zealand',
  '德国': 'Germany', '法国': 'France', '英国': 'UK', '北欧': 'Scandinavia',
  '阿联酋': 'UAE', '沙特': 'Saudi Arabia', '中东': 'Middle East', '东南亚': 'Southeast Asia',
  '墨西哥': 'Mexico', '越南': 'Vietnam', '瑞典': 'Sweden'
};
function countryEn(c) { return COUNTRY_EN[c] || c; }

// 各渠道对应的搜索意图；compliant=合规源（合规模式只跑这些）
var CHANNEL_QUERIES = [
  { channel: 'Google 搜索', compliant: true, q: function (kw, c) { return kw + ' distributor OR importer ' + c + ' contact'; } },
  { channel: 'Google 地图', compliant: true, q: function (kw, c) { return kw + ' company ' + c; } },
  { channel: '海关数据', compliant: true, q: function (kw, c) { return kw + ' importer ' + c + ' customs'; } },
  { channel: 'B2B 目录', compliant: true, q: function (kw, c) { return kw + ' ' + c + ' site:europages.co.uk OR site:kompass.com'; } },
  { channel: '行业展会', compliant: true, q: function (kw, c) { return kw + ' ' + c + ' exhibitor list'; } },
  { channel: 'LinkedIn', compliant: false, q: function (kw, c) { return kw + ' ' + c + ' site:linkedin.com/company'; } },
  { channel: 'X（推特）', compliant: false, q: function (kw, c) { return kw + ' ' + c + ' site:x.com'; } },
  { channel: 'YouTube', compliant: false, q: function (kw, c) { return kw + ' ' + c + ' site:youtube.com'; } },
  { channel: 'Facebook', compliant: false, q: function (kw, c) { return kw + ' ' + c + ' site:facebook.com'; } }
];

async function findCompanies(opts) {
  var kw = (opts.keyword || 'product').split(/[\/(（]/)[0].trim();
  var countries = (opts.countries && opts.countries.length) ? opts.countries : ['美国'];
  var mode = opts.mode || 'compliant';
  var channels = CHANNEL_QUERIES.filter(function (ch) { return mode === 'full' || ch.compliant; });

  if (!cfg.search.live) return demoCompanies(kw, countries, channels);

  var out = [];
  for (var i = 0; i < channels.length; i++) {
    var ch = channels[i];
    var country = countries[i % countries.length];
    try {
      var found = await serpapi(ch.q(kw, countryEn(country)));
      found.slice(0, 2).forEach(function (r) {
        out.push({ company: r.title, website: r.domain, country: country, channel: ch.channel });
      });
    } catch (e) { console.warn('[search] ' + ch.channel + ' 失败:', e.message); }
  }
  return out.length ? out : demoCompanies(kw, countries, channels);
}

async function serpapi(query) {
  var u = 'https://serpapi.com/search.json?engine=google&num=5&q=' +
    encodeURIComponent(query) + '&api_key=' + encodeURIComponent(cfg.search.serpApiKey);
  var res = await fetch(u);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var data = await res.json();
  return (data.organic_results || []).map(function (r) {
    var domain = '';
    try { domain = new URL(r.link).hostname.replace(/^www\./, ''); } catch (e) {}
    return { title: r.title, domain: domain, link: r.link };
  }).filter(function (r) { return r.domain; });
}

/* ---- 演示回退：合成候选公司 ---- */
var GEO = ['Alpine', 'Coastal', 'Sunrise', 'Northern', 'Blue Lake', 'Green Valley', 'Summit', 'Harbor', 'Golden'];
var SUF = ['Trading', 'Supply Co', 'Resorts', 'Group', 'Imports', 'Ltd', 'Developments'];
function demoCompanies(kw, countries, channels) {
  var kwCap = kw.split(' ').slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  var out = [];
  var seed = 0;
  channels.forEach(function (ch, ci) {
    for (var i = 0; i < 2; i++) {
      seed++;
      var name = GEO[(seed * 3) % GEO.length] + ' ' + kwCap + ' ' + SUF[(seed * 2) % SUF.length];
      var country = countries[seed % countries.length];
      out.push({
        company: name,
        website: name.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.com',
        country: country,
        channel: ch.channel
      });
    }
  });
  return out;
}

module.exports = { findCompanies: findCompanies };
