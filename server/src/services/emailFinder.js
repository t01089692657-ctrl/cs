/* ============ 找邮箱服务（Hunter / Apollo） ============
 * live：按 EMAIL_FINDER_PROVIDER 调 API，按公司域名（可带人名）查负责人邮箱。
 * demo：无 key 时按域名合成一个 info@ 邮箱。
 * 返回：{ email, confidence, source } 或 { email: '' }
 */
'use strict';
var cfg = require('../config');

async function find(domain, person) {
  if (!domain) return { email: '', source: 'none' };
  if (!cfg.emailFinder.live) {
    return { email: 'info@' + clean(domain), confidence: 0, source: 'demo' };
  }
  try {
    if (cfg.emailFinder.provider === 'apollo') return await apollo(domain, person);
    return await hunter(domain, person);
  } catch (e) {
    console.warn('[emailFinder] 失败，回退合成邮箱:', e.message);
    return { email: 'info@' + clean(domain), confidence: 0, source: 'fallback' };
  }
}

async function hunter(domain, person) {
  var u = 'https://api.hunter.io/v2/domain-search?domain=' + encodeURIComponent(clean(domain)) +
    '&api_key=' + encodeURIComponent(cfg.emailFinder.key) + '&limit=5';
  var res = await fetch(u);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var data = await res.json();
  var emails = (data.data && data.data.emails) || [];
  if (!emails.length) return { email: '', source: 'hunter' };
  // 优先决策角色
  var best = emails.find(function (e) { return /owner|ceo|founder|purchas|procure|director|manager/i.test(e.position || ''); }) || emails[0];
  return { email: best.value, confidence: best.confidence || 0, source: 'hunter' };
}

async function apollo(domain, person) {
  var res = await fetch('https://api.apollo.io/v1/people/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': cfg.emailFinder.key },
    body: JSON.stringify({ domain: clean(domain), name: person || undefined, reveal_personal_emails: false })
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var data = await res.json();
  var p = data.person || {};
  return { email: p.email || '', confidence: p.email ? 80 : 0, source: 'apollo' };
}

function clean(domain) {
  return String(domain).replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
}

module.exports = { find: find };
