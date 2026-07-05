/* 手动初始化数据库：建表 + 创建首个管理员账号。
 * 用法：cd server && npm run initdb
 * （正常启动 node src/index.js 也会自动执行同样的 bootstrap，此脚本供手动初始化用。）
 */
'use strict';
var store = require('./store');

store.bootstrap()
  .then(function () {
    console.log('✅ 数据库初始化完成，存储模式:', store.kind);
    process.exit(0);
  })
  .catch(function (e) {
    console.error('❌ 数据库初始化失败:', e.message);
    process.exit(1);
  });
