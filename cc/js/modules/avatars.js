/* ============ 模块：企业管理端 · 分身系列（一个文件注册三个模块） ============
 * ① tech-avatar  技术分身：技术知识库内部问答，未命中自动转真人+记录待补充
 * ② boss-avatar  老板分身：今日简报 / 待我审批 / 问老板分身
 * ③ hr-finance   人事/财务：二期规划占位
 * 编码约定同 dashboard.js：IIFE、App.esc 转义、事件绑定在 innerHTML 之后。
 */
(function () {
  'use strict';

  /* ================= 共用：聊天消息工具 ================= */

  // 追加一条"我"的消息（右侧绿泡）
  function pushMe(msgsEl, text) {
    var row = document.createElement('div');
    row.className = 'msg-row me';
    row.innerHTML = '<div class="bubble">' + App.esc(text) + '</div>';
    msgsEl.appendChild(row);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  // 追加一条 AI 消息容器（左侧白泡+ai-tag），返回打字机输出的目标元素
  function pushAi(msgsEl, tagLabel) {
    var row = document.createElement('div');
    row.className = 'msg-row them';
    row.innerHTML = '<div class="bubble"><span class="ai-tag">' + App.esc(tagLabel) + '</span>' +
      '<div class="av-ans" style="margin-top:6px"></div></div>';
    msgsEl.appendChild(row);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return row.querySelector('.av-ans');
  }

  /* ================= ① 技术分身 ================= */

  // 待补充知识队列（模块私有 mock，运行期追加，仅存内存）
  var pendingKB = [
    { q: 'EH-40 能否改双层结构？', from: '王浩', time: '昨天 15:20' },
    { q: '沙特 SASO 认证要什么文件？', from: '李婷', time: '3天前' }
  ];

  // 知识库关键词匹配：问题切成二字词元，与每条 q+a 做包含计分取最高
  function kbMatch(question) {
    var norm = String(question || '').toLowerCase().replace(/[^a-z0-9一-龥\-℃㎡]/g, '');
    var seen = {};
    var grams = [];
    for (var i = 0; i < norm.length - 1; i++) {
      var g = norm.substr(i, 2);
      if (!seen[g]) { seen[g] = 1; grams.push(g); }
    }
    if (!grams.length && norm) grams = [norm];
    if (!grams.length) return null;
    var best = null, bestScore = 0;
    App.data.techKB.forEach(function (item) {
      var hay = (item.q + item.a).toLowerCase();
      var s = 0;
      grams.forEach(function (gr) { if (hay.indexOf(gr) >= 0) s++; });
      if (s > bestScore) { bestScore = s; best = item; }
    });
    // 至少命中 2 个词元，且覆盖率达 25%，避免误答
    if (best && bestScore >= 2 && bestScore / grams.length >= 0.25) return best;
    return null;
  }

  function renderTech(el) {
    var kb = App.data.techKB;
    var busy = false;

    var chipsHtml = kb.slice(0, 5).map(function (item) {
      return '<span class="chip ta-chip" data-q="' + App.esc(item.q) + '">' + App.esc(item.q) + '</span>';
    }).join('');

    var kbListHtml = kb.map(function (item, i) {
      return '<div class="ta-kb-item" data-i="' + i + '">' +
        '<span class="muted" style="margin-right:6px">' + (i + 1) + '.</span>' + App.esc(item.q) + '</div>';
    }).join('');

    el.innerHTML =
      '<style>' +
      '.mod-tech-avatar .ta-cols{display:flex;gap:16px;align-items:flex-start}' +
      '.mod-tech-avatar .ta-left{flex:0 0 60%;max-width:60%;min-width:0}' +
      '.mod-tech-avatar .ta-right{flex:1;min-width:0}' +
      '.mod-tech-avatar .ta-msgs{height:400px;overflow-y:auto;background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:10px}' +
      '.mod-tech-avatar .ta-chip{cursor:pointer;transition:all .15s}' +
      '.mod-tech-avatar .ta-chip:hover{background:var(--accent-soft);color:var(--accent)}' +
      '.mod-tech-avatar .ta-kb-item{padding:8px 6px;border-bottom:1px solid #f1f3f7;cursor:pointer;font-size:13px;border-radius:6px}' +
      '.mod-tech-avatar .ta-kb-item:hover{color:var(--accent);background:#f8fafc}' +
      '.mod-tech-avatar .ta-pend{padding:8px 10px;border:1px dashed var(--line);border-radius:8px;margin-bottom:8px;font-size:12.5px;line-height:1.6}' +
      '@media (max-width:1100px){.mod-tech-avatar .ta-cols{flex-direction:column}.mod-tech-avatar .ta-left{flex:1;max-width:100%;width:100%}.mod-tech-avatar .ta-right{width:100%}}' +
      '</style>' +
      '<div class="mod-tech-avatar">' +
      '<div class="notice">把技术员的知识复制成内部问答分身，业务员随时问，不再打断技术员</div>' +
      '<div class="ta-cols">' +

      // 左：问答区（60%）
      '<div class="ta-left"><div class="card mb0">' +
      '<div class="card-title">技术分身 · 内部问答 <span class="sub">知识来源：技术知识库 ' + kb.length + ' 条</span></div>' +
      '<div class="ta-msgs" id="ta-msgs">' +
      '<div class="msg-row them"><div class="bubble"><span class="ai-tag">🔧 技术分身</span>' +
      '<div style="margin-top:6px">你好，我是 Kevin 的技术分身。结构、水电、地基、吊装、防水、物流…随便问：知识库有的我秒回，没有的我转真人 Kevin 并自动记录。</div></div></div>' +
      '</div>' +
      '<div class="mt12 small muted mb8">快捷提问（来自高频知识条目）：</div>' +
      '<div>' + chipsHtml + '</div>' +
      '<div class="row mt12">' +
      '<input class="input" id="ta-input" placeholder="输入技术问题，如：客户地基怎么做 / 吊装有什么要求…">' +
      '<button class="btn btn-primary" id="ta-ask">提问</button>' +
      '</div>' +
      '</div></div>' +

      // 右：知识库侧栏（40%）
      '<div class="ta-right">' +
      '<div class="grid grid-3 mb12" style="gap:10px">' +
      App.ui.kpi('知识条目数', kb.length, '技术员持续沉淀') +
      App.ui.kpi('本周命中', '47 次', '业务员自助解决') +
      App.ui.kpi('节省工时', '≈6.5 小时', '本周为技术员估算') +
      '</div>' +
      '<div class="card"><div class="card-title">知识条目 <span class="sub">点击查看全文</span></div>' +
      '<div id="ta-kb-list">' + kbListHtml + '</div></div>' +
      '<div class="card mb0"><div class="card-title">待补充知识队列 <span class="sub">未命中问题自动入队</span></div>' +
      '<div id="ta-pending"></div>' +
      '<button class="btn btn-sm mt8" id="ta-notify">提醒技术员补充</button></div>' +
      '</div>' +

      '</div></div>';

    // ---- 事件与逻辑（innerHTML 之后） ----
    var msgs = el.querySelector('#ta-msgs');
    var input = el.querySelector('#ta-input');

    function renderPending() {
      var box = el.querySelector('#ta-pending');
      if (!box) return;
      if (!pendingKB.length) { box.innerHTML = App.ui.empty('暂无待补充知识', '✅'); return; }
      box.innerHTML = pendingKB.map(function (p) {
        return '<div class="ta-pend"><div>' + App.esc(p.q) + '</div>' +
          '<div class="muted" style="font-size:11px;margin-top:3px">' + App.esc(p.from) + ' · ' + App.esc(p.time) +
          ' · ' + App.ui.badge('待补充', 'warn') + '</div></div>';
      }).join('');
    }
    renderPending();

    async function runAsk(q) {
      busy = true;
      pushMe(msgs, q);
      var stop = App.ai.thinking(msgs, '正在检索技术知识库…');
      msgs.scrollTop = msgs.scrollHeight;
      await App.ai.delay(1300);
      stop();
      var hit = kbMatch(q);
      var ansEl = pushAi(msgs, '🔧 技术分身');
      if (hit) {
        await App.ai.typeInto(ansEl, hit.a);
      } else {
        await App.ai.typeInto(ansEl, '这个问题知识库还没覆盖，已转真人技术员 Kevin，同时记入「待补充知识」清单。');
        pendingKB.push({ q: q, from: '我', time: '刚刚' });
        renderPending();
        App.ui.toast('已记入待补充知识清单，技术员补充后全员可查', 'ok');
      }
      msgs.scrollTop = msgs.scrollHeight;
      busy = false;
    }

    function ask(q) {
      if (busy) { App.ui.toast('分身正在回答，请稍候'); return; }
      runAsk(q);
    }

    el.querySelector('#ta-ask').onclick = function () {
      var v = input.value.trim();
      if (!v) { App.ui.toast('请先输入问题'); return; }
      input.value = '';
      ask(v);
    };
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) el.querySelector('#ta-ask').click();
    });

    el.querySelectorAll('.ta-chip').forEach(function (c) {
      c.onclick = function () { ask(c.getAttribute('data-q')); };
    });

    el.querySelector('#ta-kb-list').addEventListener('click', function (e) {
      var item = e.target.closest ? e.target.closest('.ta-kb-item') : null;
      if (!item) return;
      var kbi = kb[Number(item.getAttribute('data-i'))];
      if (!kbi) return;
      App.ui.modal(kbi.q,
        '<div class="ai-box" style="line-height:1.8">' + App.esc(kbi.a) + '</div>' +
        '<div class="small muted mt12">来源：技术知识库 · 维护人 Kevin · 业务员可直接转发给客户前请先人工确认</div>',
        '<button class="btn" id="ta-kb-close">关闭</button>');
      document.getElementById('ta-kb-close').onclick = App.ui.closeModal;
    });

    el.querySelector('#ta-notify').onclick = function () {
      App.ui.toast('演示环境：正式版将通过企业微信提醒 Kevin 补充 ' + pendingKB.length + ' 条知识');
    };
  }

  /* ================= ② 老板分身 ================= */

  // 审批状态（会话内存：id -> 'ok' | 'no'）
  var approvalState = {};

  function bossMatch(question) {
    var s = String(question || '').toLowerCase();
    var list = App.data.bossQA;
    for (var i = 0; i < list.length; i++) {
      var trs = list[i].triggers || [];
      for (var j = 0; j < trs.length; j++) {
        if (trs[j] && s.indexOf(String(trs[j]).toLowerCase()) >= 0) return list[i];
      }
    }
    return null;
  }

  function renderBoss(el) {
    var brief = App.data.bossBrief;
    var busy = false;
    var chips = ['这个月业绩怎么样', '产能排期情况', 'Mike 的单子进展', '广告投放效果', '验厂准备情况'];

    el.innerHTML =
      '<style>' +
      '.mod-boss-avatar .ba-cash{display:flex;gap:36px;align-items:center;padding:12px 14px;background:#f8fafc;border:1px solid var(--line);border-radius:8px;flex-wrap:wrap}' +
      '.mod-boss-avatar .ba-hl{font-size:13px;line-height:1.9}' +
      '.mod-boss-avatar .ba-appr{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px;font-size:13px;transition:all .2s}' +
      '.mod-boss-avatar .ba-appr.is-ok{background:var(--ok-soft);border-color:#bbf7d0}' +
      '.mod-boss-avatar .ba-appr.is-no{background:#f1f3f7;color:var(--muted)}' +
      '.mod-boss-avatar .ba-msgs{height:300px;overflow-y:auto;background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:10px}' +
      '.mod-boss-avatar .ba-chip{cursor:pointer;transition:all .15s}' +
      '.mod-boss-avatar .ba-chip:hover{background:var(--accent-soft);color:var(--accent)}' +
      '.mod-boss-avatar .ba-sched{font-size:13px;padding:6px 0;border-bottom:1px dashed #eef1f6}' +
      '.mod-boss-avatar .ba-sched:last-child{border-bottom:none}' +
      '</style>' +
      '<div class="mod-boss-avatar">' +

      // 1. 今日简报
      '<div class="card"><div class="card-title">📋 今日简报 <span class="sub">' + App.esc(brief.date) + ' · AI 每早 8:00 自动生成</span></div>' +
      '<div class="ba-cash mb12">' +
      '<div><div class="kpi-label">本月回款</div><div class="kpi-value text-ok">' + App.fmt.money(brief.cash.in) + '</div></div>' +
      '<div><div class="kpi-label">本月支出</div><div class="kpi-value text-bad">' + App.fmt.money(brief.cash.out) + '</div></div>' +
      '<div class="small muted" style="flex:1;min-width:200px">' + App.esc(brief.cash.note) + '</div>' +
      '</div>' +
      '<div class="bold small mb8">今日要点</div>' +
      brief.highlights.map(function (h) { return '<div class="ba-hl">• ' + App.esc(h) + '</div>'; }).join('') +
      '<div class="bold small mt12 mb8">今日日程</div>' +
      brief.schedule.map(function (s) { return '<div class="ba-sched">🕐 ' + App.esc(s) + '</div>'; }).join('') +
      '</div>' +

      // 2. 待我审批
      '<div class="card"><div class="card-title">✍️ 待我审批 <span class="sub">价格 / 预算 / 费用，一处批完</span></div>' +
      '<div id="ba-apprs"></div></div>' +

      // 3. 问老板分身
      '<div class="card mb0"><div class="card-title">💬 问老板分身 <span class="sub">基于当日经营数据回答</span></div>' +
      '<div class="ba-msgs" id="ba-msgs">' +
      '<div class="msg-row them"><div class="bubble"><span class="ai-tag">🧑‍💼 老板分身</span>' +
      '<div style="margin-top:6px">老板好，我已同步今日经营数据。业绩、产能、重点客户、广告效果、验厂安排都可以直接问我。</div></div></div>' +
      '</div>' +
      '<div class="mt12">' +
      chips.map(function (c) { return '<span class="chip ba-chip" data-q="' + App.esc(c) + '">' + App.esc(c) + '</span>'; }).join('') +
      '</div>' +
      '<div class="row mt12">' +
      '<input class="input" id="ba-input" placeholder="问一句，如：这个月业绩怎么样">' +
      '<button class="btn btn-primary" id="ba-ask">提问</button>' +
      '</div></div>' +

      '</div>';

    // ---- 待我审批 ----
    function renderApprovals() {
      var box = el.querySelector('#ba-apprs');
      if (!box) return;
      var typeColor = { '价格审批': 'warn', '预算审批': 'accent', '费用审批': 'info' };
      var html = brief.approvals.map(function (a) {
        var st = approvalState[a.id];
        var cls = st === 'ok' ? ' is-ok' : (st === 'no' ? ' is-no' : '');
        var right;
        if (st === 'ok') right = '<span class="text-ok bold" style="white-space:nowrap">已批准 ✓</span>';
        else if (st === 'no') right = '<span class="muted bold" style="white-space:nowrap">已驳回</span>';
        else right = '<button class="btn btn-sm btn-ok" data-ok="' + App.esc(a.id) + '">批准</button>' +
          '<button class="btn btn-sm btn-danger" data-no="' + App.esc(a.id) + '">驳回</button>';
        return '<div class="ba-appr' + cls + '">' +
          App.ui.badge(a.type, typeColor[a.type] || 'gray') +
          '<div style="flex:1;min-width:0">' + App.esc(a.title) +
          '<div class="small muted" style="margin-top:2px">提交人：' + App.esc(a.by) + '</div></div>' +
          right + '</div>';
      }).join('');
      var allDone = brief.approvals.every(function (a) { return !!approvalState[a.id]; });
      if (allDone) html += '<div class="text-ok bold" style="text-align:center;padding:12px 0 4px">今日审批已清空 ✓</div>';
      box.innerHTML = html;
      box.querySelectorAll('[data-ok]').forEach(function (b) {
        b.onclick = function () {
          approvalState[b.getAttribute('data-ok')] = 'ok';
          App.ui.toast('已批准，结果已同步给提交人', 'ok');
          renderApprovals();
        };
      });
      box.querySelectorAll('[data-no]').forEach(function (b) {
        b.onclick = function () {
          approvalState[b.getAttribute('data-no')] = 'no';
          App.ui.toast('已驳回，提交人将收到通知与理由填写提醒');
          renderApprovals();
        };
      });
    }
    renderApprovals();

    // ---- 问老板分身 ----
    var msgs = el.querySelector('#ba-msgs');
    var input = el.querySelector('#ba-input');

    async function runAsk(q) {
      busy = true;
      pushMe(msgs, q);
      var stop = App.ai.thinking(msgs, '正在调取经营数据…');
      msgs.scrollTop = msgs.scrollHeight;
      await App.ai.delay(1400);
      stop();
      var hit = bossMatch(q);
      var ansEl = pushAi(msgs, '🧑‍💼 老板分身');
      if (hit) {
        await App.ai.typeInto(ansEl, hit.a);
      } else {
        await App.ai.typeInto(ansEl, '这个问题我还没学会，已记录给助理跟进。');
        App.ui.toast('已记入助理待办清单');
      }
      msgs.scrollTop = msgs.scrollHeight;
      busy = false;
    }

    function ask(q) {
      if (busy) { App.ui.toast('分身正在回答，请稍候'); return; }
      runAsk(q);
    }

    el.querySelector('#ba-ask').onclick = function () {
      var v = input.value.trim();
      if (!v) { App.ui.toast('请先输入问题'); return; }
      input.value = '';
      ask(v);
    };
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) el.querySelector('#ba-ask').click();
    });
    el.querySelectorAll('.ba-chip').forEach(function (c) {
      c.onclick = function () { ask(c.getAttribute('data-q')); };
    });
  }

  /* ================= ③ 人事 / 财务（二期规划占位） ================= */

  function renderHr(el) {
    var plans = [
      { icon: '📝', name: '招聘 JD 生成', desc: '输入岗位关键词，AI 生成中英文职位描述与面试问题清单' },
      { icon: '📄', name: '简历初筛助手', desc: '按岗位画像自动打分排序，标注外贸经验亮点与风险点' },
      { icon: '🕒', name: '考勤月报汇总', desc: '自动汇总打卡与请假数据，异常考勤一键标记提醒' },
      { icon: '💰', name: '提成佣金试算', desc: '按签单/回款节点自动试算业务员提成，规则透明可查' },
      { icon: '📬', name: '应收对账提醒', desc: '尾款到期自动提醒，逾期客户按账龄分级催收' },
      { icon: '🧾', name: '报销流程助手', desc: '票据拍照识别自动填单，按额度自动走审批流' }
    ];

    el.innerHTML =
      '<style>' +
      '.mod-hr-finance .hf-card{cursor:pointer;transition:all .15s}' +
      '.mod-hr-finance .hf-card:hover{border-color:var(--accent);box-shadow:0 4px 14px rgba(37,99,235,.12)}' +
      '.mod-hr-finance .hf-icon{font-size:26px;margin-bottom:8px}' +
      '</style>' +
      '<div class="mod-hr-finance">' +
      '<div class="mb12"><span class="badge badge-gray">远期规划</span></div>' +
      '<div class="notice">该端在企业管理端二期启动，先聚焦流量与销转</div>' +
      '<div class="grid grid-3">' +
      plans.map(function (p) {
        return '<div class="card mb0 hf-card"><div class="hf-icon">' + p.icon + '</div>' +
          '<div class="bold mb8">' + App.esc(p.name) + '</div>' +
          '<div class="small muted" style="line-height:1.7">' + App.esc(p.desc) + '</div></div>';
      }).join('') +
      '</div></div>';

    el.querySelectorAll('.hf-card').forEach(function (c) {
      c.onclick = function () { App.ui.toast('二期功能，敬请期待'); };
    });
  }

  /* ================= 注册 ================= */

  App.registerModule({
    id: 'tech-avatar',
    nav: { section: '企业管理端', label: '技术分身', icon: '🔧' },
    render: renderTech
  });

  App.registerModule({
    id: 'boss-avatar',
    nav: { section: '企业管理端', label: '老板分身', icon: '🧑‍💼' },
    render: renderBoss
  });

  App.registerModule({
    id: 'hr-finance',
    nav: { section: '企业管理端', label: '人事 / 财务', icon: '🗂️' },
    render: renderHr
  });
})();
