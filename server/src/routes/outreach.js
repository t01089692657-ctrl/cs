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

router.use(auth.requireAuth);

// 保存发信邮箱（授权码不回传前端）
router.put('/account', async function (req, res) {
  var a = req.body || {};
  if (!a.email) return res.status(400).json({ error: '请填写邮箱地址' });
  await store.settings.set('email_account', {
    name: a.name || '', email: a.email,
    host: a.host || '', port: a.port || 465,
    auth: a.auth || '' // 授权码：仅存服务器端
  });
  await store.audit.log({ user_id: req.user.sub, user_email: req.user.email, action: 'email-account:save', detail: { email: a.email } });
  res.json({ ok: true });
});

router.get('/account', async function (req, res) {
  var a = await store.settings.get('email_account');
  if (!a) return res.json(null);
  res.json({ name: a.name, email: a.email, host: a.host, port: a.port, configured: !!a.auth });
});

// 批量发送开发信
router.post('/send', async function (req, res) {
  var recipients = (req.body && req.body.recipients) || [];
  var template = (req.body && req.body.template) || {};
  if (!recipients.length) return res.status(400).json({ error: '没有收件人' });
  var account = await store.settings.get('email_account');
  if (!account || !account.email) return res.status(400).json({ error: '未配置发信邮箱' });
  try {
    var result = await mailer.sendBatch(recipients, template, account);
    await store.audit.log({
      user_id: req.user.sub, user_email: req.user.email,
      action: 'outreach:send',
      detail: { count: recipients.length, sent: result.sent, mode: result.mode }
    });
    res.json(result);
  } catch (e) {
    console.error('[outreach] 失败:', e);
    res.status(500).json({ error: '发送失败: ' + e.message });
  }
});

module.exports = router;
