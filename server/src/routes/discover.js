/* ============ 路由：一键全渠道获客 ============
 * POST /api/discover  { keyword, countries[], mode }  → 获客 agent 抓取结果
 */
'use strict';
var express = require('express');
var router = express.Router();
var auth = require('../auth');
var harvest = require('../services/harvest');
var store = require('../db/store');
var cfg = require('../config');

router.post('/', auth.requireAuth, async function (req, res) {
  var opts = {
    keyword: (req.body && req.body.keyword) || '',
    countries: (req.body && req.body.countries) || [],
    mode: (req.body && req.body.mode) || 'compliant'
  };
  try {
    var results = await harvest.run(opts);
    await store.audit.log({
      user_id: req.user.sub, user_email: req.user.email,
      action: 'discover',
      detail: { keyword: opts.keyword, mode: opts.mode, found: results.length }
    });
    res.json({ mode: cfg.modes(), count: results.length, results: results });
  } catch (e) {
    console.error('[discover] 失败:', e);
    res.status(500).json({ error: '获客失败: ' + e.message });
  }
});

module.exports = router;
