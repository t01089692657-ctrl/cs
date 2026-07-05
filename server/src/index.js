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

// 统一错误兜底：不把内部错误细节回传给客户端（避免信息泄露），仅服务端记录
app.use(function (err, req, res, next) {
  console.error('[error]', req.method, req.path, err && err.stack || err);
  res.status(500).json({ error: '服务器繁忙，请稍后重试' });
});

// 进程级兜底：记录但不退出，避免单个异步异常拖垮整个服务
process.on('unhandledRejection', function (e) { console.error('[unhandledRejection]', e && e.stack || e); });
process.on('uncaughtException', function (e) { console.error('[uncaughtException]', e && e.stack || e); });

async function start() {
  // 真实部署（配了数据库）前，拒绝使用默认/占位的签名密钥与管理员密码
  if (cfg.db.live) {
    var problems = cfg.securityProblems();
    if (problems.length) {
      console.error('❌ 安全配置不合格，拒绝启动：');
      problems.forEach(function (p) { console.error('   - ' + p); });
      console.error('请修改 server/.env 后重试。');
      process.exit(1);
    }
  } else {
    var warn = cfg.securityProblems();
    if (warn.length) console.warn('[warn] 演示模式放行，但上线前请修复：' + warn.join('；'));
  }
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
