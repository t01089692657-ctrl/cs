/* ============ 模块：经营驾驶舱（同时是其他模块的编码示范） ============
 * 约定示范：
 * 1. 整个文件用 IIFE 包裹，避免全局变量冲突
 * 2. 数据一律读 App.data，HTML 拼接注意 App.esc() 转义
 * 3. 事件绑定在 render 内、innerHTML 之后进行
 * 4. 模块私有样式内联在 render 输出的 <style> 里，选择器以 .mod-dashboard 开头
 */
(function () {
  'use strict';

  function render(el) {
    var d = App.data;
    var k = d.kpis;

    var recentLeads = d.leadsPool.slice(0, 6);
    var todos = d.followups.slice(0, 5);

    el.innerHTML =
      '<style>' +
      '.mod-dashboard .funnel-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}' +
      '</style>' +
      '<div class="mod-dashboard">' +

      // KPI 行
      '<div class="grid grid-6 mb12">' +
      App.ui.kpi('今日新线索', k.todayLeads, '<span class="text-ok">↑ 全渠道</span>') +
      App.ui.kpi('本周线索', k.weekLeads, '上周 32 · <span class="text-ok">+22%</span>') +
      App.ui.kpi('广告月消耗', App.fmt.money(k.adSpendMonth), '单线索成本 ' + App.fmt.money(k.cpl)) +
      App.ui.kpi('待跟进客户', k.pendingFollowups, '<span class="text-warn">3 个超 48 小时</span>') +
      App.ui.kpi('本周视频产量', k.videosWeek, '2 条待审核') +
      App.ui.kpi('本月签单额', App.fmt.money(224000), '含意向 $86k') +
      '</div>' +

      // 图表行
      '<div class="grid grid-3">' +
      '<div class="card mb0"><div class="card-title">7 日线索趋势</div>' + App.ui.svgLine(k.weekTrend, { height: 110 }) + '</div>' +
      '<div class="card mb0"><div class="card-title">本周渠道占比</div>' + App.ui.svgBars(k.channelSplit, { labelWidth: '74px' }) + '</div>' +
      '<div class="card mb0"><div class="card-title">销售漏斗（本月）</div><div id="dash-funnel"></div></div>' +
      '</div>' +

      // 列表行
      '<div class="grid grid-2 mt16">' +
      '<div class="card mb0"><div class="card-title">最新线索 <span class="sub">来自线索池</span></div>' +
      App.ui.table([
        { key: 'name', label: '客户', render: function (r) { return '<b>' + App.esc(r.name) + '</b><div class="small muted">' + App.esc(r.country) + '</div>'; } },
        { key: 'source', label: '来源', render: function (r) { return App.ui.badge(r.source, r.source === '广告投放' ? 'accent' : r.source === '视频号' ? 'purple' : r.source === '主动开发' ? 'info' : 'gray'); } },
        { key: 'msg', label: '首条消息', render: function (r) { return '<span class="small">' + App.esc(r.msg) + '</span>'; } },
        { key: 'status', label: '状态', render: function (r) { return App.ui.badge(r.status, r.status === '未分配' ? 'warn' : r.status === '已转客户' ? 'ok' : 'gray'); } }
      ], recentLeads) +
      '<div class="mt12"><button class="btn btn-sm" id="dash-go-leads">进入线索池 →</button></div></div>' +

      '<div class="card mb0"><div class="card-title">今日待办跟进 <span class="sub">来自 CRM 跟进记录</span></div>' +
      '<div class="timeline">' +
      todos.map(function (f) {
        var c = App.findCustomer(f.customerId);
        return '<div class="tl-item"><div class="tl-time">' + App.esc(f.date) + ' · ' + App.esc(f.by) + ' · ' +
          (c ? App.esc(c.name) : '') + '</div><div class="tl-body">' + App.esc(f.next) + '</div></div>';
      }).join('') +
      '</div>' +
      '<div class="mt8"><button class="btn btn-sm" id="dash-go-crm">进入客户管理 →</button></div></div>' +
      '</div>' +

      '</div>';

    // 漏斗
    var funnelEl = el.querySelector('#dash-funnel');
    var max = k.funnel[0].v;
    funnelEl.innerHTML = k.funnel.map(function (s, i) {
      var pct = Math.round(s.v / max * 100);
      var colors = ['#2563eb', '#4f46e5', '#7c3aed', '#0891b2', '#16a34a'];
      return '<div class="funnel-row">' +
        '<div style="width:70px;font-size:12px;color:var(--muted);text-align:right">' + App.esc(s.label) + '</div>' +
        '<div style="flex:1"><div style="width:' + Math.max(pct, 8) + '%;background:' + colors[i] +
        ';height:20px;border-radius:4px;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center">' + s.v + '</div></div>' +
        '</div>';
    }).join('');

    // 事件
    el.querySelector('#dash-go-leads').onclick = function () { App.navigate('leads'); };
    el.querySelector('#dash-go-crm').onclick = function () { App.navigate('crm'); };
  }

  App.registerModule({
    id: 'dashboard',
    nav: { section: '总览', label: '经营驾驶舱', icon: '📈' },
    render: render
  });
})();
