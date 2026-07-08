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

// 若配置了出海代理，让海外 API 请求走代理（境内 Mac mini 场景）
require('./proxy')();

var app = express();
app.use(cors());
app.use(express.json({ limit: '30mb' }));  // 产品图为 dataURL，放宽体积

// 健康检查 + 各能力运行模式（前端据此判断走后端还是本地演示）
app.get('/api/health', function (req, res) {
  res.json({ ok: true, service: 'waimao-fulllink', storage: store.kind, modes: cfg.modes(), getkeUrl: cfg.getkeWebUrl });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/discover', require('./routes/discover'));
app.use('/api/outreach', require('./routes/outreach'));
app.use('/api/engine', require('./routes/engine'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/video', require('./routes/video'));

// 合成产物（生成的视频）静态托管
app.use('/generated', express.static(path.join(__dirname, '..', 'storage')));

// 托管前端：仅放行应用运行所需的静态资源，避免把 cc/数据、cc/资料模板、
// 内部 .md 文档等敏感文件对外裸奔（这些无需登录即可被下载）。
var FRONT = path.join(__dirname, '..', '..', 'cc');
var STATIC_OK = /^\/(js\/|assets\/|favicon|generated\/)/;
app.get('/', function (req, res) { res.sendFile(path.join(FRONT, 'index.html')); });
app.get('/index.html', function (req, res) { res.sendFile(path.join(FRONT, 'index.html')); });
app.use(function (req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (STATIC_OK.test(req.path)) return next();
  // 非白名单的非 API 路径一律 404，杜绝目录遍历式下载
  return res.status(404).json({ error: 'Not found' });
});
app.use(express.static(FRONT, { dotfiles: 'deny' }));

// 统一错误兜底：保留客户端错误(4xx，如 413 体积过大)的语义，仅对 5xx 隐藏细节
app.use(function (err, req, res, next) {
  var status = err && (err.status || err.statusCode) || 500;
  console.error('[error]', req.method, req.path, err && err.stack || err);
  if (status === 413) {
    return res.status(413).json({ error: '数据过大（可能产品图片过多或过大），请精简后再保存' });
  }
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: (err && err.message) || '请求有误' });
  }
  res.status(500).json({ error: '服务器繁忙，请稍后重试' });
});

// 进程级兜底：记录但不退出，避免单个异步异常拖垮整个服务
process.on('unhandledRejection', function (e) { console.error('[unhandledRejection]', e && e.stack || e); });
process.on('uncaughtException', function (e) { console.error('[uncaughtException]', e && e.stack || e); });

async function start() {
  // 安全闸门覆盖所有模式（含内存/演示模式）：
  // 只要用了默认/占位的签名密钥或管理员密码，就【只绑本机 127.0.0.1】——
  // 本机能自测，但同网段/公网无法访问，杜绝“带着公开密钥+admin123 对外上线被接管”。
  // 想让 10 人访问，必须先在 .env 设置强 JWT_SECRET 与 ADMIN_PASSWORD。
  var problems = cfg.securityProblems();
  var host = process.env.HOST || (problems.length ? '127.0.0.1' : '0.0.0.0');
  if (problems.length) {
    console.warn('⚠️  安全配置未完成，服务仅绑定本机(127.0.0.1)，同事无法访问：');
    problems.forEach(function (p) { console.warn('   - ' + p); });
    console.warn('   在 server/.env 设好后重启，即可对局域网开放。');
  }

  try {
    await store.bootstrap();
    console.log('[db] 存储模式:', store.kind);
    if (!cfg.db.live) {
      console.warn('⚠️  未配置 DATABASE_URL：正在使用【内存库】，重启后所有数据（客户/线索/账号）将清空。正式使用请配置 PostgreSQL。');
    }
  } catch (e) {
    console.error('[db] 初始化失败:', e.message);
    process.exit(1);
  }

  var server = app.listen(cfg.port, host, function () {
    console.log('外贸全链路服务已启动: http://' + (host === '0.0.0.0' ? 'localhost' : host) + ':' + cfg.port + '（绑定 ' + host + '）');
    console.log('运行模式:', JSON.stringify(cfg.modes()));
  });
  server.on('error', function (e) {
    if (e.code === 'EADDRINUSE') console.error('❌ 端口 ' + cfg.port + ' 已被占用，换个 PORT 或停掉占用进程后重启。');
    else console.error('❌ 服务监听失败:', e.message);
    process.exit(1);
  });
}

// 供测试引用；直接运行时启动
if (require.main === module) start();
module.exports = { app: app, start: start };
