/* ============ 路由：共享业务数据（10 人共享） ============
 * GET  /api/collections        取全部共享数据
 * GET  /api/collections/:name  取单个集合
 * PUT  /api/collections/:name  整表覆盖保存（与前端“整表持久化”一致）+ 审计
 * 白名单限定可写集合，避免任意键写入。
 */
'use strict';
var express = require('express');
var router = express.Router();
var store = require('../db/store');
var auth = require('../auth');
var ah = require('../asyncHandler');

var ALLOWED = ['products', 'videoTemplates', 'videoQueue', 'videoProjects', 'icp', 'prospects', 'customers', 'leadsPool', 'faq', 'redlines'];

router.use(auth.requireAuth);

router.get('/', ah(async function (req, res) {
  res.json(await store.collections.getAll());
}));

router.get('/:name', ah(async function (req, res) {
  if (ALLOWED.indexOf(req.params.name) < 0) return res.status(404).json({ error: '未知集合' });
  res.json({ name: req.params.name, data: await store.collections.get(req.params.name) });
}));

router.put('/:name', ah(async function (req, res) {
  var name = req.params.name;
  if (ALLOWED.indexOf(name) < 0) return res.status(400).json({ error: '不允许写入该集合' });
  var data = req.body && req.body.data;
  if (data === undefined) return res.status(400).json({ error: '缺少 data' });
  await store.collections.set(name, data, req.user.sub);
  await store.audit.log({
    user_id: req.user.sub, user_email: req.user.email,
    action: 'update:' + name,
    detail: { count: Array.isArray(data) ? data.length : null }
  });
  res.json({ ok: true });
}));

module.exports = router;
