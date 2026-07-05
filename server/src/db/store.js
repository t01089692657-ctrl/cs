/* ============ 存储层入口：按配置选择 Postgres 或内存 ============ */
'use strict';
var cfg = require('../config');
var bcrypt = require('bcryptjs');

var store = cfg.db.live
  ? require('./pgStore')(cfg.db.url)
  : require('./memoryStore')();

// 首次启动：建表 + 确保有管理员账号
store.bootstrap = async function () {
  await store.init();
  var admin = await store.users.getByEmail(cfg.admin.email);
  if (!admin) {
    await store.users.create({
      id: 'u-admin',
      email: cfg.admin.email,
      name: '管理员',
      role: 'admin',
      pass_hash: bcrypt.hashSync(cfg.admin.password, 10),
      active: true
    });
    console.log('[store] 已创建初始管理员账号:', cfg.admin.email);
  }
};

module.exports = store;
