/* ============ 路由：认证 ============ */
'use strict';
var express = require('express');
var bcrypt = require('bcryptjs');
var router = express.Router();
var store = require('../db/store');
var auth = require('../auth');
var ah = require('../asyncHandler');

// 登录
router.post('/login', ah(async function (req, res) {
  var email = (req.body && req.body.email || '').trim();
  var password = (req.body && req.body.password) || '';
  if (!email || !password) return res.status(400).json({ error: '请填写邮箱和密码' });
  var user = await store.users.getByEmail(email);
  if (!user || user.active === false || !bcrypt.compareSync(password, user.pass_hash)) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }
  await store.audit.log({ user_id: user.id, user_email: user.email, action: 'login' });
  res.json({
    token: auth.sign(user),
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
}));

// 当前用户
router.get('/me', auth.requireAuth, function (req, res) {
  res.json({ id: req.user.sub, email: req.user.email, name: req.user.name, role: req.user.role });
});

module.exports = router;
