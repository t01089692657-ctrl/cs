/* ============ 认证：JWT 签发与校验、角色守卫 ============ */
'use strict';
var jwt = require('jsonwebtoken');
var cfg = require('./config');
var store = require('./db/store');

function sign(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    cfg.jwtSecret,
    { expiresIn: '7d' }
  );
}

// 校验中间件：验签后再回查数据库，确保用户仍存在且启用，并使用 DB 中最新角色。
// 这样管理员停用/删除/降权后，对应令牌即时失效（不必等 7 天过期）。
function requireAuth(req, res, next) {
  var h = req.headers.authorization || '';
  var m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: '未登录' });
  var payload;
  try {
    payload = jwt.verify(m[1], cfg.jwtSecret);
  } catch (e) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
  store.users.getById(payload.sub).then(function (u) {
    if (!u || u.active === false) {
      return res.status(401).json({ error: '账号已停用或不存在，请重新登录' });
    }
    // 以数据库为准（角色可能已被管理员调整）
    req.user = { sub: u.id, email: u.email, name: u.name, role: u.role };
    next();
  }).catch(function () {
    res.status(500).json({ error: '认证服务暂时不可用' });
  });
}

// 角色守卫：requireRole('admin')
function requireRole(role) {
  return function (req, res, next) {
    if (!req.user || req.user.role !== role) return res.status(403).json({ error: '无权限' });
    next();
  };
}

module.exports = { sign: sign, requireAuth: requireAuth, requireRole: requireRole };
