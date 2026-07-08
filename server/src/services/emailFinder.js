/* ============ 找邮箱服务（Hunter / Apollo） ============
 * live：按 EMAIL_FINDER_PROVIDER 调 API，按公司域名（可带人名）查负责人邮箱。
 * demo：无 key 时按域名合成一个 info@ 邮箱（仅演示，明确标注 source:'demo'）。
 * 关键：真实模式下查不到就返回空邮箱，绝不猜测/合成——猜测的邮箱会 100% 退信、污染潜客库。
 * 返回：{ email, confidence, source } 或 { email: '' }
 */
'use strict';
var cfg = require('../config');
var fetchT = require('./httpx').fetchT;

// 判断是否为可投递的真实邮箱（排除 Apollo 等的锁定占位串）
function isRealEmail(email) {
  if (!email || typeof email !== 'string') return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  // Apollo 未解锁时返回 email_not_unlocked@domain.com 之类占位
  if (/not_unlocked|not-unlocked|unlock|hidden|redacted|noemail|no-email|example\.com$/i.test(email)) return false;
  return true;
}

async function find(domain, person) {
  if (!domain) return { email: '', source: 'none' };
  // 演示模式（未配 key）才合成邮箱
  if (!cfg.emailFinder.live) {
    return { email: 'info@' + clean(domain), confidence: 0, source: 'demo' };
  }
  try {
    var r = cfg.emailFinder.provider === 'apollo' ? await apollo(domain, person) : await hunter(domain, person);
    if (!isRealEmail(r.email)) return { email: '', confidence: 0, source: r.source };  // 无有效邮箱：留空，不猜
    return r;
  } catch (e) {
    console.warn('[emailFinder] 失败:', e.message);
    return { email: '', confidence: 0, source: 'error' };  // 真实模式失败：留空，不合成
  }
}

async function hunter(domain, person) {
  var u = 'https://api.hunter.io/v2/domain-search?domain=' + encodeURIComponent(clean(domain)) +
    '&api_key=' + encodeURIComponent(cfg.emailFinder.key) + '&limit=5';
  var res = await fetchT(u, {}, 20000);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var data = await res.json();
  var emails = (data.data && data.data.emails) || [];
  if (!emails.length) return { email: '', source: 'hunter' };
  var best = emails.find(function (e) { return /owner|ceo|founder|purchas|procure|director|manager/i.test(e.position || ''); }) || emails[0];
  return { email: best.value, confidence: best.confidence || 0, source: 'hunter' };
}

async function apollo(domain, person) {
  var res = await fetchT('https://api.apollo.io/v1/people/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': cfg.emailFinder.key },
    body: JSON.stringify({ domain: clean(domain), name: person || undefined, reveal_personal_emails: false })
  }, 20000);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var data = await res.json();
  var p = data.person || {};
  return { email: p.email || '', confidence: p.email ? 80 : 0, source: 'apollo' };
}

function clean(domain) {
  return String(domain).replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
}

module.exports = { find: find };
