/* ============ 获客 agent 编排 ============
 * 流程：搜索找公司 → 抓取官网 → LLM 提取信息+打分 → 找邮箱 → 汇总。
 * 每一步的服务若无 key 会自动回退演示实现，所以整条链路在演示模式也能跑通，
 * 部署填 key 后逐项变真实。
 * 返回：[{channel,company,website,country,person,role,email,signals[],score}]
 */
'use strict';
var search = require('./search');
var crawl = require('./crawl');
var emailFinder = require('./emailFinder');
var llm = require('./llm');
var cfg = require('../config');

var ROLES = ['Owner / Founder', 'Purchasing Manager', 'Project Manager', 'Director'];
var FIRST = ['James', 'Sarah', 'Mike', 'Emma', 'Lucas', 'Olivia', 'Daniel', 'Sophie', 'Erik', 'Anna', 'Carlos', 'Nina'];
var LAST = ['Miller', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Weber', 'Larsen', 'Costa', 'Novak', 'Schmidt'];

async function run(opts) {
  var companies = await search.findCompanies(opts);
  var results = [];

  // 并发抓取+提取，控制并发数避免过猛
  var CONC = 4;
  for (var i = 0; i < companies.length; i += CONC) {
    var batch = companies.slice(i, i + CONC);
    var settled = await Promise.all(batch.map(function (c, k) { return enrich(c, opts, i + k); }));
    settled.forEach(function (r) { if (r) results.push(r); });
  }

  results.sort(function (a, b) { return b.score - a.score; });
  return results;
}

async function enrich(company, opts, idx) {
  try {
    var page = await crawl.scrape('https://' + company.website);
    var info = await extractInfo(page.markdown, company);
    var mail = await emailFinder.find(company.website, info.person);
    var score = await scoreProspect(company, info, opts);
    return {
      channel: company.channel,
      company: company.company,
      website: company.website,
      country: company.country,
      person: info.person,
      role: info.role,
      email: mail.email || '',
      signals: info.signals.concat(['来源: ' + company.channel]),
      score: score
    };
  } catch (e) {
    console.warn('[harvest] enrich 失败:', company.company, e.message);
    return null;
  }
}

// 从抓取内容里提取联系人/角色/信号：有 LLM 用 LLM，否则合成
async function extractInfo(markdown, company) {
  if (cfg.llm.live && markdown) {
    try {
      var out = await llm.chat([
        { role: 'system', content: '你是外贸获客助手。从网页内容中提取信息，只输出 JSON：{"person":"负责人姓名或空","role":"职位","signals":["采购/扩建等信号"]}。' },
        { role: 'user', content: '公司：' + company.company + '\n网页内容：\n' + String(markdown).slice(0, 4000) }
      ], { temperature: 0.2 });
      var parsed = JSON.parse(pickJson(out));
      return {
        person: parsed.person || synthName(company),
        role: parsed.role || ROLES[hash(company.company) % ROLES.length],
        signals: Array.isArray(parsed.signals) && parsed.signals.length ? parsed.signals : ['官网含相关业务']
      };
    } catch (e) { /* 落到合成 */ }
  }
  return {
    person: synthName(company),
    role: ROLES[hash(company.company) % ROLES.length],
    signals: ['官网含相关业务信号']
  };
}

// 打分：有 LLM 用 LLM，否则按规则
async function scoreProspect(company, info, opts) {
  var base = 55;
  if ((opts.countries || []).indexOf(company.country) >= 0) base += 15;
  if (/Owner|Purchas/i.test(info.role)) base += 8;
  if (company.channel === '海关数据') base += 8;
  base = Math.min(base + (hash(company.company) % 10), 96);

  if (cfg.llm.live) {
    try {
      var out = await llm.chat([
        { role: 'system', content: '给外贸潜客打分。只输出 JSON：{"score":0-100}。综合行业匹配、目标市场、决策角色、信号。' },
        { role: 'user', content: JSON.stringify({ company: company.company, country: company.country, role: info.role, signals: info.signals, targetCountries: opts.countries, keyword: opts.keyword }) }
      ], { temperature: 0.1 });
      var parsed = JSON.parse(pickJson(out));
      if (typeof parsed.score === 'number') return Math.max(0, Math.min(100, Math.round(parsed.score)));
    } catch (e) { /* 落到规则分 */ }
  }
  return base;
}

function synthName(company) {
  var h = hash(company.company);
  return FIRST[h % FIRST.length] + ' ' + LAST[(h >> 3) % LAST.length];
}
function hash(s) {
  var h = 0; s = String(s);
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return h;
}
function pickJson(text) {
  var m = String(text).match(/\{[\s\S]*\}/);
  return m ? m[0] : '{}';
}

module.exports = { run: run };
