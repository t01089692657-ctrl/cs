/* 包装 async 路由处理器：把被拒绝的 Promise 转交给 Express 错误中间件，
 * 避免 Express 4 下 async 抛错变成未处理拒绝、请求挂起甚至进程崩溃。 */
'use strict';
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
