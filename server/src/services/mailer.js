/* ============ 发信服务（SMTP） ============
 * live：用配置的企业邮箱 SMTP 真实发送；{name}/{company}/{country} 自动替换。
 * demo：无 SMTP 配置时仅记录不真实发出。
 * 返回：{ sent, failed, mode, details[] }
 */
'use strict';
var cfg = require('../config');

var transporter = null;
function getTransport() {
  if (!cfg.smtp.live) return null;
  if (transporter) return transporter;
  var nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: cfg.smtp.host,
    port: cfg.smtp.port,
    secure: cfg.smtp.port === 465,
    auth: { user: cfg.smtp.user, pass: cfg.smtp.pass }
  });
  return transporter;
}

function fill(tpl, p) {
  return String(tpl || '')
    .replace(/\{name\}/g, (p.person || 'there').split(' ')[0])
    .replace(/\{company\}/g, p.company || '')
    .replace(/\{country\}/g, p.country || '');
}

async function sendBatch(recipients, template, account) {
  var t = getTransport();
  var fromEmail = (account && account.email) || cfg.smtp.user;
  var fromName = (account && account.name) || cfg.smtp.fromName || '';
  var results = [];
  var sent = 0, failed = 0;

  for (var i = 0; i < recipients.length; i++) {
    var r = recipients[i];
    if (!r.email) { failed++; results.push({ to: r.company, ok: false, reason: 'no-email' }); continue; }
    var subject = fill(template.subject, r);
    var body = fill(template.body, r);
    if (!t) {
      // 演示模式：不真实发出
      sent++; results.push({ to: r.email, ok: true, mode: 'demo' });
      continue;
    }
    try {
      await t.sendMail({
        from: fromName ? '"' + fromName + '" <' + fromEmail + '>' : fromEmail,
        to: r.email,
        subject: subject,
        text: body
      });
      sent++; results.push({ to: r.email, ok: true, mode: 'live' });
    } catch (e) {
      failed++; results.push({ to: r.email, ok: false, reason: e.message });
    }
  }
  return { sent: sent, failed: failed, mode: t ? 'live' : 'demo', details: results };
}

module.exports = { sendBatch: sendBatch };
