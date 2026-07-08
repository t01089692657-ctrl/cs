/* ============ 发信服务（SMTP） ============
 * 发送身份选择（认证账号必须等于发件人，避免被拒信/判垃圾）：
 *   1) 优先用界面「登录发信邮箱」里那个邮箱自己的 SMTP（host/port/授权码）——
 *      认证 = 发件 = 该邮箱，SPF/DKIM 对齐，最不易进垃圾。
 *   2) 否则退回 .env 里的中转 SMTP——认证与发件都用 SMTP_USER（不用 UI 邮箱当发件人）。
 *   3) 两者都没有 → 演示模式：不真实发出，且如实返回 mode:'demo'（不谎报已发）。
 * {name}/{company}/{country} 自动替换。返回 { sent, failed, mode, details[] }。
 */
'use strict';
var cfg = require('../config');

// 依据账号构造发送器；返回 { t, from, fromName } 或 null（演示模式）
function buildSender(account) {
  var nodemailer = require('nodemailer');
  // 1) 界面登录的邮箱自带 SMTP（host + 邮箱 + 授权码齐全）
  // 统一的连接超时，避免 SMTP 不可达时请求长时间挂起
  var TIMEOUTS = { connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000 };
  if (account && account.host && account.email && account.auth) {
    var port = parseInt(account.port, 10) || 465;
    return {
      t: nodemailer.createTransport(Object.assign({
        host: account.host, port: port, secure: port === 465,
        auth: { user: account.email, pass: account.auth }
      }, TIMEOUTS)),
      from: account.email,                 // 认证=发件，一致
      fromName: (account.name || '')
    };
  }
  // 2) .env 中转 SMTP
  if (cfg.smtp.live) {
    return {
      t: nodemailer.createTransport(Object.assign({
        host: cfg.smtp.host, port: cfg.smtp.port, secure: cfg.smtp.port === 465,
        auth: { user: cfg.smtp.user, pass: cfg.smtp.pass }
      }, TIMEOUTS)),
      from: cfg.smtp.user,                 // 用已认证账号当发件人，避免不一致被拒
      fromName: cfg.smtp.fromName || (account && account.name) || ''
    };
  }
  // 3) 演示模式
  return null;
}

function fill(tpl, p) {
  return String(tpl || '')
    .replace(/\{name\}/g, (p.person || 'there').split(' ')[0])
    .replace(/\{company\}/g, p.company || '')
    .replace(/\{country\}/g, p.country || '');
}

async function sendBatch(recipients, template, account) {
  var sender = buildSender(account);
  var results = [];
  var sent = 0, failed = 0;

  for (var i = 0; i < recipients.length; i++) {
    var r = recipients[i];
    if (!r.email) { failed++; results.push({ to: r.company, ok: false, reason: 'no-email' }); continue; }
    var subject = fill(template.subject, r);
    var body = fill(template.body, r);
    if (!sender) {
      // 演示模式：不真实发出。sent 计数仍累加以便前端展示流程，但 mode='demo' 会如实告知未真发。
      results.push({ to: r.email, ok: true, mode: 'demo' });
      sent++;
      continue;
    }
    try {
      await sender.t.sendMail({
        from: sender.fromName ? '"' + sender.fromName + '" <' + sender.from + '>' : sender.from,
        to: r.email,
        subject: subject,
        text: body
      });
      sent++; results.push({ to: r.email, ok: true, mode: 'live' });
    } catch (e) {
      failed++; results.push({ to: r.email, ok: false, reason: e.message });
    }
  }
  return { sent: sent, failed: failed, mode: sender ? 'live' : 'demo', details: results };
}

module.exports = { sendBatch: sendBatch };
