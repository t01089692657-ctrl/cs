/* ============ 路由：WhatsApp 通道B（协议/网页版） ============
 * GET  /api/whatsapp/status         连接状态（含扫码二维码）
 * POST /api/whatsapp/connect        发起连接（返回二维码，扫码登录）
 * POST /api/whatsapp/logout         退出登录
 * GET  /api/whatsapp/chats          会话列表
 * GET  /api/whatsapp/messages?jid=  某会话消息
 * POST /api/whatsapp/send {jid,text} 发送（限速防封）
 */
'use strict';
var express = require('express');
var router = express.Router();
var auth = require('../auth');
var wa = require('../services/whatsapp');
var store = require('../db/store');
var ah = require('../asyncHandler');

router.use(auth.requireAuth);

router.get('/status', ah(async function (req, res) { res.json(wa.status()); }));

router.post('/connect', ah(async function (req, res) {
  var s = await wa.connect();
  await store.audit.log({ user_id: req.user.sub, user_email: req.user.email, action: 'whatsapp:connect', detail: { status: s.status } });
  res.json(s);
}));

router.post('/logout', ah(async function (req, res) {
  var s = await wa.logout();
  await store.audit.log({ user_id: req.user.sub, user_email: req.user.email, action: 'whatsapp:logout' });
  res.json(s);
}));

router.get('/chats', ah(async function (req, res) { res.json({ chats: wa.listChats() }); }));

router.get('/messages', ah(async function (req, res) {
  var jid = (req.query.jid || '').toString();
  if (!jid) return res.status(400).json({ error: '缺少 jid' });
  res.json({ jid: jid, messages: wa.listMessages(jid) });
}));

router.post('/send', ah(async function (req, res) {
  var jid = req.body && req.body.jid;
  var text = req.body && req.body.text;
  if (typeof jid !== 'string' || typeof text !== 'string' || !jid || !text.trim()) {
    return res.status(400).json({ error: '缺少收件人或内容' });
  }
  try {
    var r = await wa.send(jid, text.trim());
    await store.audit.log({ user_id: req.user.sub, user_email: req.user.email, action: 'whatsapp:send', detail: { jid: jid } });
    res.json(r);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

module.exports = router;
