/* ============ 出海请求工具：带超时的 fetch ============
 * 给所有海外 API 调用（搜索/抓取/找邮箱/大模型）加应用层超时，
 * 避免上游连上却迟迟不回时，整轮获客卡住数分钟。
 */
'use strict';

// fetchT(url, opts, ms)：ms 超时后 abort，抛 Error('请求超时')
function fetchT(url, opts, ms) {
  opts = opts || {};
  ms = ms || 20000;
  var ctl = new AbortController();
  var timer = setTimeout(function () { ctl.abort(); }, ms);
  var merged = Object.assign({}, opts, { signal: ctl.signal });
  return fetch(url, merged).then(
    function (r) { clearTimeout(timer); return r; },
    function (e) {
      clearTimeout(timer);
      if (e && e.name === 'AbortError') throw new Error('请求超时（' + ms + 'ms）: ' + url);
      throw e;
    }
  );
}

module.exports = { fetchT: fetchT };
