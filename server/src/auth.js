/* ============ 认证：JWT 签发与校验、角色守卫 ============ */
'use strict';
var jwt = require('jsonwebtoken');
var cfg = require('./config');

function sign(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    cfg.jwtSecret,
    { expiresIn: '7d' }
  );
}

// 校验中间件：从 Authorization: Bearer <token> 取用户
function requireAuth(req, res, next) {
  var h = req.headers.authorization || '';
  var m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: '未登录' });
  try {
    req.user = jwt.verify(m[1], cfg.jwtSecret);
    next();
  } catch (e) {
    res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

// 角色守卫：requireRole('admin')
function requireRole(role) {
  return function (req, res, next) {
    if (!req.user || req.user.role !== role) return res.status(403).json({ error: '无权限' });
    next();
  };
}

module.exports = { sign: sign, requireAuth: requireAuth, requireRole: requireRole };
