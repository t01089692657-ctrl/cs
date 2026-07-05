/* ============ 路由：管理后台（仅 admin） ============
 * GET    /api/admin/users        用户列表
 * POST   /api/admin/users        新建用户 {email,name,role,password}
 * PATCH  /api/admin/users/:id    改用户 {name?,role?,active?,password?}
 * DELETE /api/admin/users/:id    删用户
 * GET    /api/admin/audit        操作审计
 */
'use strict';
var express = require('express');
var bcrypt = require('bcryptjs');
var router = express.Router();
var store = require('../db/store');
var auth = require('../auth');

router.use(auth.requireAuth, auth.requireRole('admin'));

var ROLES = ['admin', 'sales', 'ops'];

router.get('/users', async function (req, res) {
  res.json(await store.users.list());
});

router.post('/users', async function (req, res) {
  var b = req.body || {};
  var email = (b.email || '').trim();
  if (!email || !b.password) return res.status(400).json({ error: '请填写邮箱和初始密码' });
  if (b.role && ROLES.indexOf(b.role) < 0) return res.status(400).json({ error: '角色不合法' });
  if (await store.users.getByEmail(email)) return res.status(409).json({ error: '该邮箱已存在' });
  var user = {
    id: 'u-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    email: email, name: b.name || '', role: b.role || 'sales',
    pass_hash: bcrypt.hashSync(b.password, 10), active: true
  };
  await store.users.create(user);
  await store.audit.log({ user_id: req.user.sub, user_email: req.user.email, action: 'user:create', detail: { email: email, role: user.role } });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, active: true });
});

router.patch('/users/:id', async function (req, res) {
  var b = req.body || {};
  var patch = {};
  if (b.name != null) patch.name = b.name;
  if (b.role != null) { if (ROLES.indexOf(b.role) < 0) return res.status(400).json({ error: '角色不合法' }); patch.role = b.role; }
  if (b.active != null) patch.active = !!b.active;
  if (b.password) patch.pass_hash = bcrypt.hashSync(b.password, 10);
  var u = await store.users.update(req.params.id, patch);
  if (!u) return res.status(404).json({ error: '用户不存在' });
  await store.audit.log({ user_id: req.user.sub, user_email: req.user.email, action: 'user:update', detail: { id: req.params.id, fields: Object.keys(patch) } });
  res.json({ ok: true });
});

router.delete('/users/:id', async function (req, res) {
  if (req.params.id === req.user.sub) return res.status(400).json({ error: '不能删除自己' });
  await store.users.remove(req.params.id);
  await store.audit.log({ user_id: req.user.sub, user_email: req.user.email, action: 'user:delete', detail: { id: req.params.id } });
  res.json({ ok: true });
});

router.get('/audit', async function (req, res) {
  var limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
  res.json(await store.audit.list(limit));
});

module.exports = router;
