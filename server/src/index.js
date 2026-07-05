/* ============ 外贸全链路 AI 系统 · 服务器入口 ============
 * 一个服务同时提供：REST API（/api/*）+ 前端静态页面（../cc）。
 * 启动即可用：无 DATABASE_URL / 无各 API key 时以演示模式运行，
 * 在 .env 填入对应 key 后自动切到真实模式（见 config.js）。
 */
'use strict';
var path = require('path');
var express = require('express');
var cors = require('cors');
var cfg = require('./config');
var store = require('./db/store');

var app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));  // 产品图为 dataURL，放宽体积

// 健康检查 + 各能力运行模式（前端据此判断走后端还是本地演示）
app.get('/api/health', function (req, res) {
  res.json({ ok: true, service: 'waimao-fulllink', storage: store.kind, modes: cfg.modes() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/discover', require('./routes/discover'));
app.use('/api/outreach', require('./routes/outreach'));
app.use('/api/engine', require('./routes/engine'));
app.use('/api/admin', require('./routes/admin'));

// 托管前端（同域，避免跨域）
var FRONT = path.join(__dirname, '..', '..', 'cc');
app.use(express.static(FRONT));
app.get('/', function (req, res) { res.sendFile(path.join(FRONT, 'index.html')); });

// 统一错误兜底
app.use(function (err, req, res, next) {
  console.error('[error]', err);
  res.status(500).json({ error: '服务器错误: ' + (err && err.message || err) });
});

async function start() {
  try {
    await store.bootstrap();
    console.log('[db] 存储模式:', store.kind);
  } catch (e) {
    console.error('[db] 初始化失败:', e.message);
    process.exit(1);
  }
  app.listen(cfg.port, function () {
    console.log('外贸全链路服务已启动: http://localhost:' + cfg.port);
    console.log('运行模式:', JSON.stringify(cfg.modes()));
  });
}

// 供测试引用；直接运行时启动
if (require.main === module) start();
module.exports = { app: app, start: start };
