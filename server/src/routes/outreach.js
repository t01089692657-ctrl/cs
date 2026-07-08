/* ============ 路由：批量发送开发信 + 发信邮箱账号 ============
 * PUT  /api/outreach/account   保存发信邮箱（密钥存服务器端，不回传）
 * GET  /api/outreach/account   取发信邮箱（不含密码）
 * POST /api/outreach/send      { recipients[], template }  批量发送
 */
'use strict';
var express = require('express');
var router = express.Router();
var auth = require('../auth');
var store = require('../db/store');
var mailer = require('../services/mailer');
var ah = require('../asyncHandler');

router.use(auth.requireAuth);

// 保存发信邮箱（授权码不回传前端）
router.put('/account', ah(async function (req, res) {
  var a = req.body || {};
  if (!a.email || typeof a.email !== 'string') return res.status(400).json({ error: '请填写邮箱地址' });
  // 授权码为空时保留服务端已存的旧授权码，避免“只改发件人名却把授权码清空”
  var prev = await store.settings.get('email_account') || {};
  var auth = (a.auth && String(a.auth)) || (prev.email === a.email ? prev.auth : '') || '';
  await store.settings.set('email_account', {
    name: a.name || '', email: a.email,
    host: a.host || '', port: a.port || 465,
    auth: auth // 授权码：仅存服务器端
  });
  await store.audit.log({ user_id: req.user.sub, user_email: req.user.email, action: 'email-account:save', detail: { email: a.email } });
  res.json({ ok: true, configured: !!auth });
}));

router.get('/account', ah(async function (req, res) {
  var a = await store.settings.get('email_account');
  if (!a) return res.json(null);
  res.json({ name: a.name, email: a.email, host: a.host, port: a.port, configured: !!a.auth });
}));

// 批量发送开发信
router.post('/send', ah(async function (req, res) {
  var recipients = (req.body && req.body.recipients) || [];
  var template = (req.body && req.body.template) || {};
  if (!recipients.length) return res.status(400).json({ error: '没有收件人' });
  var account = await store.settings.get('email_account');
  if (!account || !account.email) return res.status(400).json({ error: '未配置发信邮箱' });
  var result = await mailer.sendBatch(recipients, template, account);
  await store.audit.log({
    user_id: req.user.sub, user_email: req.user.email,
    action: 'outreach:send',
    detail: { count: recipients.length, sent: result.sent, mode: result.mode }
  });
  res.json(result);
}));

module.exports = router;
