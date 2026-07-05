/* ============ 路由：获客引擎状态与模式 ============
 * live 模式下引擎的 key 来自服务器 .env（不在前端配置）。
 * GET /api/engine        返回各能力是否已配置 + 当前数据来源模式
 * PUT /api/engine/mode   设置数据来源模式（compliant/full，10 人共享）
 */
'use strict';
var express = require('express');
var router = express.Router();
var auth = require('../auth');
var store = require('../db/store');
var cfg = require('../config');

router.use(auth.requireAuth);

router.get('/', async function (req, res) {
  var mode = await store.settings.get('discovery_mode');
  res.json({
    configured: {
      llm: cfg.llm.live,
      crawl: cfg.crawl.live,
      search: cfg.search.live,
      emailFinder: cfg.emailFinder.live,
      smtp: cfg.smtp.live
    },
    ready: cfg.llm.live && cfg.crawl.live,   // 有大模型 + 抓取即可真实获客
    mode: mode || 'compliant'
  });
});

router.put('/mode', async function (req, res) {
  var mode = (req.body && req.body.mode) === 'full' ? 'full' : 'compliant';
  await store.settings.set('discovery_mode', mode);
  await store.audit.log({ user_id: req.user.sub, user_email: req.user.email, action: 'engine:mode', detail: { mode: mode } });
  res.json({ ok: true, mode: mode });
});

module.exports = router;
