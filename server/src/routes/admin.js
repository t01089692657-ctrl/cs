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
var ah = require('../asyncHandler');

router.use(auth.requireAuth, auth.requireRole('admin'));

var ROLES = ['admin', 'sales', 'ops'];

router.get('/users', ah(async function (req, res) {
  res.json(await store.users.list());
}));

router.post('/users', ah(async function (req, res) {
  var b = req.body || {};
  if (typeof b.email !== 'string' || typeof b.password !== 'string') {
    return res.status(400).json({ error: '请填写邮箱和初始密码' });
  }
  var email = b.email.trim();
  if (!email || !b.password) return res.status(400).json({ error: '请填写邮箱和初始密码' });
  if (b.password.length < 6) return res.status(400).json({ error: '密码至少 6 位' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: '邮箱格式不正确' });
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
}));

// 是否会导致“没有可用管理员”：target 变更后活跃管理员数是否归零
async function wouldOrphanAdmins(targetId, becomesNonAdmin) {
  if (!becomesNonAdmin) return false;
  var users = await store.users.list();
  var activeAdmins = users.filter(function (u) { return u.role === 'admin' && u.active !== false; });
  // 剩余活跃管理员里排除本次被降级/停用的那个
  var remaining = activeAdmins.filter(function (u) { return u.id !== targetId; });
  return remaining.length === 0;
}

router.patch('/users/:id', ah(async function (req, res) {
  var b = req.body || {};
  var target = await store.users.getById(req.params.id);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  var patch = {};
  if (typeof b.name === 'string') patch.name = b.name;
  if (b.role != null) { if (ROLES.indexOf(b.role) < 0) return res.status(400).json({ error: '角色不合法' }); patch.role = b.role; }
  if (b.active != null) patch.active = !!b.active;
  if (b.password) {
    if (typeof b.password !== 'string' || b.password.length < 6) return res.status(400).json({ error: '密码至少 6 位' });
    patch.pass_hash = bcrypt.hashSync(b.password, 10);
  }
  // 防止把最后一个管理员降级或停用，导致后台永久锁死
  var becomesNonAdmin = (patch.role != null && patch.role !== 'admin') || patch.active === false;
  if (target.role === 'admin' && await wouldOrphanAdmins(target.id, becomesNonAdmin)) {
    return res.status(400).json({ error: '这是唯一的管理员，不能降级或停用（否则无人能管理系统）' });
  }
  var u = await store.users.update(req.params.id, patch);
  if (!u) return res.status(404).json({ error: '用户不存在' });
  await store.audit.log({ user_id: req.user.sub, user_email: req.user.email, action: 'user:update', detail: { id: req.params.id, fields: Object.keys(patch) } });
  res.json({ ok: true });
}));

router.delete('/users/:id', ah(async function (req, res) {
  if (req.params.id === req.user.sub) return res.status(400).json({ error: '不能删除自己' });
  var target = await store.users.getById(req.params.id);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  if (target.role === 'admin' && await wouldOrphanAdmins(target.id, true)) {
    return res.status(400).json({ error: '这是唯一的管理员，不能删除' });
  }
  await store.users.remove(req.params.id);
  await store.audit.log({ user_id: req.user.sub, user_email: req.user.email, action: 'user:delete', detail: { id: req.params.id } });
  res.json({ ok: true });
}));

router.get('/audit', ah(async function (req, res) {
  var limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
  res.json(await store.audit.list(limit));
}));

module.exports = router;
