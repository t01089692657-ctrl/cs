/* ============ 模块：线索池(leads) + 客户管理(crm) ============
 * 一个文件注册两个模块，遵循 dashboard.js 编码示范：
 * 1. IIFE 包裹，无全局泄漏
 * 2. 数据读写 App.data，HTML 拼接一律 App.esc() 转义
 * 3. 事件绑定在 innerHTML 之后
 * 4. 私有样式内联，选择器以 .mod-leads / .mod-crm 开头
 */
(function () {
  'use strict';

  /* ================= 共享小工具 ================= */

  function sourceBadge(src) {
    var map = { '广告投放': 'accent', '视频号': 'purple', '主动开发': 'info' };
    return App.ui.badge(src, map[src] || 'gray');
  }

  function leadStatusBadge(st) {
    var map = { '未分配': 'warn', '已分配': 'accent', '已转客户': 'ok' };
    return App.ui.badge(st, map[st] || 'gray');
  }

  /* ======================================================
   * 模块一：线索池
   * ====================================================== */

  var leadsRoot = null;

  var LEADS_CSS =
    '<style>' +
    '.mod-leads .lead-msg{max-width:240px;display:inline-block;line-height:1.5}' +
    '.mod-leads .tbl td{white-space:normal}' +
    '</style>';

  function renderLeads(el) {
    leadsRoot = el;
    paintLeads();
  }

  function paintLeads() {
    var leads = App.data.leadsPool;
    var today = leads.filter(function (l) { return String(l.time || '').indexOf('今天') >= 0; }).length;
    var unassigned = leads.filter(function (l) { return l.status === '未分配'; }).length;
    var converted = leads.filter(function (l) { return l.status === '已转客户'; }).length;

    var cols = [
      { key: 'name', label: '姓名', render: function (r) { return '<b>' + App.esc(r.name) + '</b>'; } },
      { key: 'country', label: '国家' },
      { key: 'source', label: '来源', render: function (r) { return sourceBadge(r.source); } },
      { key: 'msg', label: '首条消息', render: function (r) { return '<span class="small lead-msg">' + App.esc(r.msg) + '</span>'; } },
      { key: 'time', label: '时间', render: function (r) { return '<span class="small muted">' + App.esc(r.time) + '</span>'; } },
      { key: 'status', label: '状态', render: function (r) { return leadStatusBadge(r.status); } },
      { key: 'owner', label: '负责人', render: function (r) { return r.owner ? App.esc(r.owner) : '<span class="muted">—</span>'; } },
      {
        key: 'op', label: '操作', render: function (r) {
          if (r.status === '未分配') return '<button class="btn btn-sm" data-assign="' + App.esc(r.id) + '">分配</button>';
          if (r.status === '已分配') return '<button class="btn btn-sm btn-primary" data-convert="' + App.esc(r.id) + '">转为客户</button>';
          return '<button class="btn btn-sm btn-ghost" data-viewcust="' + App.esc(r.name) + '">查看客户</button>';
        }
      }
    ];

    leadsRoot.innerHTML =
      LEADS_CSS +
      '<div class="mod-leads">' +

      '<div class="grid grid-3 mb12">' +
      App.ui.kpi('今日新线索', today, '广告 / 视频号 / 主动开发 / 官网全渠道') +
      App.ui.kpi('未分配', unassigned, unassigned > 0 ? '<span class="text-warn">请尽快分配跟进人</span>' : '<span class="text-ok">全部已分配</span>') +
      App.ui.kpi('已转客户', converted, '已建档至客户管理') +
      '</div>' +

      '<div class="card"><div class="card-title">线索列表 <span class="sub">共 ' + leads.length + ' 条</span></div>' +
      App.ui.table(cols, leads, { emptyMsg: '暂无线索' }) +
      '</div>' +

      '<div class="notice">演示环境：正式版中线索将由广告平台 / 视频号 / 开发信回复等 API 自动汇入，并支持自动分配规则。</div>' +
      '</div>';

    /* ---- 事件绑定（innerHTML 之后） ---- */
    leadsRoot.querySelectorAll('[data-assign]').forEach(function (btn) {
      btn.onclick = function () {
        var lead = findLead(btn.getAttribute('data-assign'));
        if (lead) openAssignModal(lead);
      };
    });
    leadsRoot.querySelectorAll('[data-convert]').forEach(function (btn) {
      btn.onclick = function () {
        var lead = findLead(btn.getAttribute('data-convert'));
        if (lead) convertLead(lead);
      };
    });
    leadsRoot.querySelectorAll('[data-viewcust]').forEach(function (btn) {
      btn.onclick = function () {
        var name = btn.getAttribute('data-viewcust');
        var hit = null;
        App.data.customers.forEach(function (c) { if (!hit && c.name === name) hit = c; });
        if (hit) {
          crmView = { mode: 'detail', id: hit.id };
          App.navigate('crm');
        } else {
          App.ui.toast('未在客户库中找到该客户');
        }
      };
    });
  }

  function findLead(id) {
    var list = App.data.leadsPool;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function openAssignModal(lead) {
    var team = App.data.company.team;
    App.ui.modal(
      '分配线索：' + lead.name,
      '<div class="field"><label class="field-label">线索信息</label>' +
      '<div class="small">' + App.esc(lead.country) + ' · ' + sourceBadge(lead.source) + ' · ' + App.esc(lead.msg) + '</div></div>' +
      '<div class="field"><label class="field-label">选择负责人</label>' +
      '<select class="select" id="leads-assign-sel">' +
      team.map(function (t) { return '<option value="' + App.esc(t) + '">' + App.esc(t) + '</option>'; }).join('') +
      '</select></div>',
      '<button class="btn" id="leads-assign-cancel">取消</button>' +
      '<button class="btn btn-primary" id="leads-assign-ok">确认分配</button>'
    );
    document.getElementById('leads-assign-cancel').onclick = App.ui.closeModal;
    document.getElementById('leads-assign-ok').onclick = function () {
      var owner = document.getElementById('leads-assign-sel').value;
      lead.status = '已分配';
      lead.owner = owner;
      App.ui.closeModal();
      App.ui.toast('已将线索「' + lead.name + '」分配给 ' + owner, 'ok');
      paintLeads();
    };
  }

  function convertLead(lead) {
    var cust = {
      id: 'c' + Date.now() + String(Math.floor(Math.random() * 900) + 100),
      name: lead.name,
      company: lead.name + ' (待补全)',
      country: lead.country,
      flag: '🌐',
      type: '终端个人',
      intent: 'C',
      stage: '新询盘',
      tags: [lead.source],
      source: lead.source,
      owner: lead.owner,
      value: 0,
      lastContact: '今天',
      whatsapp: '-',
      email: '-',
      note: lead.msg
    };
    App.data.customers.push(cust);
    lead.status = '已转客户';
    App.ui.toast('已建档，客户管理中可见', 'ok');
    paintLeads();
  }

  App.registerModule({
    id: 'leads',
    nav: { section: '销转端', label: '线索池', icon: '📥' },
    render: renderLeads
  });

  /* ======================================================
   * 模块二：客户管理（列表视图 + 详情视图）
   * ====================================================== */

  var crmRoot = null;
  var crmView = { mode: 'list', id: null };                          // 模块内部记住当前视图
  var crmFilters = { stage: '全部', intent: '全部', type: '全部', q: '' };

  var CRM_CSS =
    '<style>' +
    '.mod-crm .filter-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}' +
    '.mod-crm .filter-row .select{width:auto;min-width:128px}' +
    '.mod-crm .filter-row .search-box{flex:1;min-width:200px}' +
    '.mod-crm .filter-label{font-size:12px;color:var(--muted);flex-shrink:0}' +
    '.mod-crm .head-avatar .avatar{width:54px;height:54px;font-size:21px;border-radius:14px}' +
    '.mod-crm .steps{margin-bottom:0;row-gap:10px}' +
    '.mod-crm .step{font-size:12px;gap:5px}' +
    '.mod-crm .step-dot{width:20px;height:20px;font-size:11px}' +
    '.mod-crm .step-line{width:12px;margin:0 4px}' +
    '.mod-crm .step.clickable{cursor:pointer}' +
    '.mod-crm .step.clickable:hover{color:var(--accent)}' +
    '.mod-crm .step.clickable:hover .step-dot{background:var(--accent-soft);color:var(--accent)}' +
    '.mod-crm .tl-body{white-space:pre-wrap}' +
    '.mod-crm .bg-out{white-space:pre-wrap;font-size:13px;line-height:1.75;margin-top:10px}' +
    '.mod-crm .tag-common .chip{cursor:pointer}' +
    '.mod-crm .tag-common .chip:hover{background:var(--accent-soft);color:var(--accent)}' +
    '</style>';

  function renderCrm(el) {
    crmRoot = el;
    // 支持其他模块跳转定位客户：App.state.crmTarget = 客户id
    if (App.state.crmTarget) {
      if (App.findCustomer(App.state.crmTarget)) crmView = { mode: 'detail', id: App.state.crmTarget };
      App.state.crmTarget = null;
    }
    if (crmView.mode === 'detail' && !App.findCustomer(crmView.id)) crmView = { mode: 'list', id: null };
    paintCrm();
  }

  function paintCrm() {
    if (crmView.mode === 'detail') {
      var c = App.findCustomer(crmView.id);
      if (c) { paintDetail(c); return; }
      crmView = { mode: 'list', id: null };
    }
    paintList();
  }

  /* ---------------- 列表视图 ---------------- */

  function buildOptions(pairs, cur) {
    return pairs.map(function (p) {
      return '<option value="' + App.esc(p.v) + '"' + (p.v === cur ? ' selected' : '') + '>' + App.esc(p.t) + '</option>';
    }).join('');
  }

  function filteredCustomers() {
    var q = crmFilters.q.trim().toLowerCase();
    return App.data.customers.filter(function (c) {
      if (crmFilters.stage !== '全部' && c.stage !== crmFilters.stage) return false;
      if (crmFilters.intent !== '全部' && c.intent !== crmFilters.intent) return false;
      if (crmFilters.type !== '全部' && c.type !== crmFilters.type) return false;
      if (q) {
        var hay = (String(c.name) + ' ' + String(c.company) + ' ' + String(c.country)).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function paintList() {
    var d = App.data;
    var stageOpts = [{ v: '全部', t: '全部阶段' }].concat(d.stages.map(function (s) { return { v: s, t: s }; }));
    var intentOpts = [{ v: '全部', t: '全部意向' }].concat(d.tagSystem.intent.map(function (it) { return { v: it.level, t: it.level + '·' + it.name }; }));
    var typeOpts = [{ v: '全部', t: '全部类型' }].concat(d.tagSystem.customerTypes.map(function (t) { return { v: t, t: t }; }));

    crmRoot.innerHTML =
      CRM_CSS +
      '<div class="mod-crm">' +

      '<div class="card"><div class="filter-row">' +
      '<span class="filter-label">阶段</span><select class="select" id="crm-f-stage">' + buildOptions(stageOpts, crmFilters.stage) + '</select>' +
      '<span class="filter-label">意向</span><select class="select" id="crm-f-intent">' + buildOptions(intentOpts, crmFilters.intent) + '</select>' +
      '<span class="filter-label">类型</span><select class="select" id="crm-f-type">' + buildOptions(typeOpts, crmFilters.type) + '</select>' +
      '<div class="search-box"><input class="input" id="crm-f-q" placeholder="搜索姓名 / 公司 / 国家" value="' + App.esc(crmFilters.q) + '"></div>' +
      '</div></div>' +

      '<div class="card"><div class="card-title">客户列表 <span class="sub" id="crm-count"></span></div>' +
      '<div id="crm-list-wrap"></div></div>' +
      '</div>';

    /* 筛选事件：任一变化即重画表格 */
    crmRoot.querySelector('#crm-f-stage').onchange = function () { crmFilters.stage = this.value; drawListTable(); };
    crmRoot.querySelector('#crm-f-intent').onchange = function () { crmFilters.intent = this.value; drawListTable(); };
    crmRoot.querySelector('#crm-f-type').onchange = function () { crmFilters.type = this.value; drawListTable(); };
    crmRoot.querySelector('#crm-f-q').oninput = function () { crmFilters.q = this.value; drawListTable(); };

    drawListTable();
  }

  function drawListTable() {
    var rows = filteredCustomers();
    var wrap = crmRoot.querySelector('#crm-list-wrap');
    var count = crmRoot.querySelector('#crm-count');
    if (!wrap) return;
    if (count) count.textContent = '共 ' + App.data.customers.length + ' 个客户，当前显示 ' + rows.length + ' 个 · 点击行查看详情';

    var cols = [
      {
        key: 'name', label: '客户', render: function (r) {
          return '<div class="row" style="gap:9px">' + App.ui.avatar(r.name) +
            '<div><div class="bold">' + App.esc(r.name) + '</div>' +
            '<div class="small muted">' + App.esc(r.company) + '</div></div></div>';
        }
      },
      { key: 'country', label: '国家', render: function (r) { return App.esc(r.flag) + ' ' + App.esc(r.country); } },
      { key: 'intent', label: '意向', render: function (r) { return App.ui.intentBadge(r.intent); } },
      { key: 'stage', label: '阶段', render: function (r) { return App.ui.stageBadge(r.stage); } },
      {
        key: 'tags', label: '标签', render: function (r) {
          var tags = r.tags || [];
          var h = tags.slice(0, 3).map(function (t) { return App.ui.chip(t); }).join('');
          if (tags.length > 3) h += '<span class="small muted">+' + (tags.length - 3) + '</span>';
          return h || '<span class="small muted">—</span>';
        }
      },
      { key: 'owner', label: '负责人' },
      { key: 'lastContact', label: '最后联系', render: function (r) { return '<span class="small muted">' + App.esc(r.lastContact) + '</span>'; } },
      { key: 'value', label: '预估金额', render: function (r) { return '<span class="bold">' + App.fmt.money(r.value) + '</span>'; } }
    ];

    wrap.innerHTML = App.ui.table(cols, rows, {
      emptyMsg: '没有符合筛选条件的客户',
      rowAttr: function (r) { return 'class="clickable" data-cid="' + App.esc(r.id) + '"'; }
    });

    wrap.querySelectorAll('tr[data-cid]').forEach(function (tr) {
      tr.onclick = function () {
        crmView = { mode: 'detail', id: tr.getAttribute('data-cid') };
        paintCrm();
      };
    });
  }

  /* ---------------- 详情视图 ---------------- */

  function stageStepsHtml(c) {
    var stages = App.data.stages;
    var cur = stages.indexOf(c.stage);
    if (cur < 0) cur = 0;
    return stages.map(function (s, i) {
      var cls = 'step' + (i < cur ? ' done' : (i === cur ? ' active' : ' clickable'));
      return '<div class="' + cls + '" data-sidx="' + i + '">' +
        '<span class="step-dot">' + (i < cur ? '✓' : (i + 1)) + '</span>' +
        '<span>' + App.esc(s) + '</span></div>';
    }).join('<span class="step-line"></span>');
  }

  function tagsHtml(c) {
    var tags = c.tags || [];
    if (!tags.length) return '<span class="small muted">暂无标签，可从下方常用标签快速添加</span>';
    return tags.map(function (t) { return App.ui.chip(t, true); }).join('');
  }

  function timelineHtml(c) {
    var list = App.data.followups.filter(function (f) { return f.customerId === c.id; });
    if (!list.length) return App.ui.empty('暂无跟进记录，点击上方按钮添加', '🗒️');
    return '<div class="timeline">' + list.map(function (f) {
      return '<div class="tl-item"><div class="tl-time">' + App.esc(f.date) + ' · ' + App.esc(f.by) + '</div>' +
        '<div class="tl-body">' + App.esc(f.summary) +
        (f.next ? '<div class="small text-accent mt8">下一步：' + App.esc(f.next) + '</div>' : '') +
        '</div></div>';
    }).join('') + '</div>';
  }

  /* AI 背调报告：按 country / type / note 模板化生成 */
  function bgReportText(c) {
    var lines = [];
    var pending = String(c.company || '').indexOf('待补全') >= 0;
    var money = App.fmt.money(c.value);
    var isTrade = ['经销商', '工程承包商'].indexOf(c.type) >= 0;
    var isOrg = ['营地/度假村运营商', '政府/机构项目'].indexOf(c.type) >= 0;
    var note = String(c.note || '');
    var tags = c.tags || [];

    lines.push('【公司网站情况】' + (pending
      ? '客户公司信息待补全，未检索到独立官网。建议先在对话中确认公司主体名称与网站后做二次背调。'
      : '检索到「' + c.company + '」（' + c.country + '）相关网页，业务描述与“' + c.type + '”定位相符，官网近半年有内容更新，主体真实性初步可信。'));

    lines.push('【社媒活跃度】客户经「' + c.source + '」渠道进线。' + (isTrade || isOrg
      ? 'LinkedIn 可检索到疑似同名商业账号，近 90 天有行业相关动态，社媒活跃度中等偏上，适合内容持续触达。'
      : '以个人社媒画像为主，商业主页信息有限，建议以 WhatsApp 一对一沟通为主要触达方式。'));

    if (isTrade) {
      lines.push('【海关进口记录】同名/关联主体近 24 个月存在建材类进口记录，具备相关品类（板房/建材）进口经验，清关环节风险较低。');
    } else if (isOrg) {
      lines.push('【海关进口记录】未检索到板房品类直接进口记录，可能为首次进口该品类，建议报价时主动提供 CIF/DDP 与清关协助选项。');
    } else {
      lines.push('【海关进口记录】个人/小微主体，无海关进口记录，属首次进口客户，需在物流、清关、到场吊装环节做更多引导。');
    }

    if (c.value >= 100000) {
      lines.push('【规模与信用初判】预估金额 ' + money + '，项目级体量。建议按大客户流程管理：合同评审、分批收款、指定专人对接。');
    } else if (c.value >= 30000) {
      lines.push('【规模与信用初判】预估金额 ' + money + '，中等体量公司类客户，信用风险可控，按标准 30% 定金流程执行即可。');
    } else {
      lines.push('【规模与信用初判】预估金额 ' + money + '，小单体量，建议提高定金比例或全款，控制尾款风险。');
    }

    if (/压价|价格敏感|比价/.test(note) || tags.indexOf('价格敏感') >= 0 || tags.indexOf('比价中') >= 0) {
      lines.push('【风险提示】客户存在明显比价/压价行为，注意守住底价红线，用价值拆解与案例代替直接降价。');
    } else if (tags.indexOf('待唤醒') >= 0 || /失联/.test(note)) {
      lines.push('【风险提示】客户已长时间未互动，存在项目搁置或转向竞品的风险，建议用新案例 + 排产/涨价信息唤醒。');
    } else if (c.intent === 'A') {
      lines.push('【风险提示】整体风险较低，主要风险为竞品截胡，保持 48 小时跟进节奏并及时响应文件需求。');
    } else {
      lines.push('【风险提示】暂无重大风险信号，按销售阶段标准动作推进即可。');
    }

    lines.push('（说明：本报告为演示模板生成，正式版将对接企业数据 + 社媒 + 海关数据 API 输出实时背调结果）');
    return lines.join('\n\n');
  }

  function paintDetail(c) {
    var d = App.data;

    crmRoot.innerHTML =
      CRM_CSS +
      '<div class="mod-crm">' +

      '<div class="mb12"><button class="btn btn-sm" id="crm-back">← 返回列表</button></div>' +

      /* ---- 头卡 ---- */
      '<div class="card">' +
      '<div style="display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap">' +
      '<div class="head-avatar row" style="gap:12px">' + App.ui.avatar(c.name) +
      '<div><div style="font-size:17px;font-weight:700">' + App.esc(c.name) + '</div>' +
      '<div class="small muted" style="margin-top:2px">' + App.esc(c.company) + '</div>' +
      '<div class="small" style="margin-top:5px">' + App.esc(c.flag) + ' ' + App.esc(c.country) + ' · ' + App.esc(c.type) + ' ' + App.ui.intentBadge(c.intent) + '</div>' +
      '</div></div>' +
      '<dl class="kv" style="flex:1;min-width:250px">' +
      '<dt>WhatsApp</dt><dd>' + App.esc(c.whatsapp) + '</dd>' +
      '<dt>邮箱</dt><dd>' + App.esc(c.email) + '</dd>' +
      '<dt>来源</dt><dd>' + sourceBadge(c.source) + '</dd>' +
      '<dt>负责人</dt><dd>' + App.esc(c.owner) + '</dd>' +
      '<dt>预估金额</dt><dd class="bold">' + App.fmt.money(c.value) + '</dd>' +
      '</dl>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
      '<button class="btn btn-primary" id="crm-open-wa">💬 打开 WhatsApp 会话</button>' +
      '<button class="btn" id="crm-edit-note">✏️ 编辑备注</button>' +
      '</div>' +
      '</div>' +
      '<div class="small muted mt12" id="crm-note-line">备注：' + App.esc(c.note || '（暂无备注）') + '</div>' +
      '</div>' +

      /* ---- 阶段推进条 ---- */
      '<div class="card"><div class="card-title">销售阶段推进 <span class="sub">点击后续阶段可推进</span></div>' +
      '<div class="steps" id="crm-stages">' + stageStepsHtml(c) + '</div></div>' +

      /* ---- 标签卡 + AI 背调卡 ---- */
      '<div class="grid grid-2">' +

      '<div class="card mb0"><div class="card-title">客户标签</div>' +
      '<div id="crm-tags-box">' + tagsHtml(c) + '</div>' +
      '<div class="row mt12" style="gap:8px">' +
      '<input class="input" id="crm-tag-input" placeholder="输入新标签，如：急单" style="flex:1">' +
      '<button class="btn btn-sm" id="crm-tag-add">添加</button></div>' +
      '<div class="small muted mt12 mb8">常用标签（点击即添加）</div>' +
      '<div class="tag-common" id="crm-tag-common">' +
      d.tagSystem.common.map(function (t) { return '<span class="chip" data-ct="' + App.esc(t) + '">＋ ' + App.esc(t) + '</span>'; }).join('') +
      '</div></div>' +

      '<div class="card mb0"><div class="card-title">AI 客户背调 <span class="ai-tag">AI</span></div>' +
      '<div class="ai-box">' +
      '<div class="row-between"><span class="small muted">模拟检索：官网 / 社媒 / 海关记录 / 信用初判</span>' +
      '<button class="btn btn-sm btn-primary" id="crm-bg-btn">生成背调报告</button></div>' +
      '<div id="crm-bg-think"></div>' +
      '<div class="bg-out" id="crm-bg-out"></div>' +
      '</div></div>' +

      '</div>' +

      /* ---- 跟进时间线 ---- */
      '<div class="card mt16"><div class="card-title">跟进时间线' +
      '<span><button class="btn btn-sm" id="crm-fu-add">✍️ 手动添加跟进</button> ' +
      '<button class="btn btn-sm btn-primary" id="crm-fu-ai">✨ AI 生成纪要</button></span></div>' +
      '<div id="crm-timeline">' + timelineHtml(c) + '</div>' +
      '</div>' +

      '</div>';

    /* ---- 事件绑定（innerHTML 之后） ---- */

    crmRoot.querySelector('#crm-back').onclick = function () {
      crmView = { mode: 'list', id: null };
      paintCrm();
    };

    crmRoot.querySelector('#crm-open-wa').onclick = function () {
      App.state.waTarget = c.id;
      App.navigate('whatsapp');
    };

    crmRoot.querySelector('#crm-edit-note').onclick = function () { openNoteModal(c); };

    crmRoot.querySelectorAll('#crm-stages .step.clickable').forEach(function (st) {
      st.onclick = function () {
        var idx = parseInt(st.getAttribute('data-sidx'), 10);
        openStageConfirm(c, idx);
      };
    });

    bindTagRemoval(c);
    crmRoot.querySelector('#crm-tag-add').onclick = function () {
      addTag(c, crmRoot.querySelector('#crm-tag-input').value);
    };
    crmRoot.querySelector('#crm-tag-input').onkeydown = function (e) {
      if (e.key === 'Enter') addTag(c, this.value);
    };
    crmRoot.querySelectorAll('#crm-tag-common [data-ct]').forEach(function (chip) {
      chip.onclick = function () { addTag(c, chip.getAttribute('data-ct')); };
    });

    bindBgReport(c);

    crmRoot.querySelector('#crm-fu-add').onclick = function () { openManualFollowup(c); };
    crmRoot.querySelector('#crm-fu-ai').onclick = function () { openAiSummary(c); };
  }

  /* ---- 详情视图子操作 ---- */

  function openNoteModal(c) {
    App.ui.modal(
      '编辑备注：' + c.name,
      '<div class="field"><label class="field-label">客户备注</label>' +
      '<textarea class="textarea" id="crm-note-ta" style="min-height:110px">' + App.esc(c.note || '') + '</textarea></div>',
      '<button class="btn" id="crm-note-cancel">取消</button>' +
      '<button class="btn btn-primary" id="crm-note-save">保存</button>'
    );
    document.getElementById('crm-note-cancel').onclick = App.ui.closeModal;
    document.getElementById('crm-note-save').onclick = function () {
      c.note = document.getElementById('crm-note-ta').value.trim();
      App.ui.closeModal();
      App.ui.toast('备注已更新', 'ok');
      var line = crmRoot.querySelector('#crm-note-line');
      if (line) line.textContent = '备注：' + (c.note || '（暂无备注）');
    };
  }

  function openStageConfirm(c, idx) {
    var target = App.data.stages[idx];
    App.ui.modal(
      '推进销售阶段',
      '<div class="notice mb0" style="margin-bottom:0">确认将客户 <b>' + App.esc(c.name) + '</b> 的阶段从 ' +
      App.ui.stageBadge(c.stage) + ' 变更为 ' + App.ui.stageBadge(target) + ' ？' +
      (target === '流失' ? '<div class="mt8 text-bad">注意：标记流失后建议在备注中补充流失原因。</div>' : '') +
      '</div>',
      '<button class="btn" id="crm-st-cancel">取消</button>' +
      '<button class="btn btn-primary" id="crm-st-ok">确认变更</button>'
    );
    document.getElementById('crm-st-cancel').onclick = App.ui.closeModal;
    document.getElementById('crm-st-ok').onclick = function () {
      c.stage = target;
      App.ui.closeModal();
      App.ui.toast('阶段已更新为「' + target + '」', 'ok');
      paintDetail(c);
    };
  }

  function bindTagRemoval(c) {
    crmRoot.querySelectorAll('#crm-tags-box [data-chip]').forEach(function (x) {
      x.onclick = function () {
        var t = x.getAttribute('data-chip');
        var i = (c.tags || []).indexOf(t);
        if (i >= 0) {
          c.tags.splice(i, 1);
          App.ui.toast('已移除标签：' + t);
          drawTags(c);
        }
      };
    });
  }

  function drawTags(c) {
    var box = crmRoot.querySelector('#crm-tags-box');
    if (!box) return;
    box.innerHTML = tagsHtml(c);
    bindTagRemoval(c);
  }

  function addTag(c, raw) {
    var t = String(raw || '').trim();
    if (!t) { App.ui.toast('请输入标签内容'); return; }
    if (!c.tags) c.tags = [];
    if (c.tags.indexOf(t) >= 0) { App.ui.toast('标签「' + t + '」已存在'); return; }
    c.tags.push(t);
    App.ui.toast('已添加标签：' + t, 'ok');
    var input = crmRoot.querySelector('#crm-tag-input');
    if (input) input.value = '';
    drawTags(c);
  }

  function bindBgReport(c) {
    var btn = crmRoot.querySelector('#crm-bg-btn');
    btn.onclick = async function () {
      if (btn.disabled) return;
      btn.disabled = true;
      var think = crmRoot.querySelector('#crm-bg-think');
      var out = crmRoot.querySelector('#crm-bg-out');
      if (!think || !out) return;
      out.textContent = '';
      var stop = App.ai.thinking(think, '正在检索官网 / 社媒 / 海关数据并交叉验证…');
      await App.ai.delay(1600);
      stop();
      await App.ai.typeInto(out, bgReportText(c), 170);
      btn.disabled = false;
      btn.textContent = '重新生成';
    };
  }

  function drawTimeline(c) {
    var box = crmRoot ? crmRoot.querySelector('#crm-timeline') : null;
    if (box) box.innerHTML = timelineHtml(c);
  }

  function openManualFollowup(c) {
    App.ui.modal(
      '手动添加跟进：' + c.name,
      '<div class="field"><label class="field-label">跟进内容</label>' +
      '<textarea class="textarea" id="crm-fu-ta" placeholder="例如：已发送三档报价单，客户周五前答复…"></textarea></div>',
      '<button class="btn" id="crm-fu-cancel">取消</button>' +
      '<button class="btn btn-primary" id="crm-fu-save">保存</button>'
    );
    document.getElementById('crm-fu-cancel').onclick = App.ui.closeModal;
    document.getElementById('crm-fu-save').onclick = function () {
      var v = document.getElementById('crm-fu-ta').value.trim();
      if (!v) { App.ui.toast('请填写跟进内容', 'bad'); return; }
      App.data.followups.unshift({ customerId: c.id, date: '今天', by: c.owner, summary: v, next: '' });
      App.ui.closeModal();
      App.ui.toast('跟进已记录', 'ok');
      drawTimeline(c);
    };
  }

  function openAiSummary(c) {
    var chats = App.data.chats[c.id];
    if (!chats || !chats.length) {
      App.ui.toast('该客户暂无 WhatsApp 聊天记录');
      return;
    }
    App.ui.modal(
      'AI 生成跟进纪要：' + c.name,
      '<div class="ai-box">' +
      '<div class="small muted mb8">AI 正在基于该客户 ' + chats.length + ' 条 WhatsApp 聊天记录生成结构化纪要</div>' +
      '<div id="crm-sum-think"></div>' +
      '<div id="crm-sum-text" style="white-space:pre-wrap;font-size:13px;line-height:1.8"></div>' +
      '</div>',
      '<button class="btn" id="crm-sum-close">关闭</button>' +
      '<button class="btn btn-primary" id="crm-sum-save" disabled>存入时间线</button>'
    );
    document.getElementById('crm-sum-close').onclick = App.ui.closeModal;

    (async function () {
      var think = document.getElementById('crm-sum-think');
      if (!think) return;
      var stop = App.ai.thinking(think, '正在阅读聊天记录，提炼关注点与建议动作…');
      await App.ai.delay(1700);
      stop();
      var textEl = document.getElementById('crm-sum-text');
      if (!textEl) return; // 用户中途关闭了弹窗
      var text = App.ai.summarize(c, chats);
      await App.ai.typeInto(textEl, text, 90);
      var saveBtn = document.getElementById('crm-sum-save');
      if (!saveBtn) return;
      saveBtn.disabled = false;
      saveBtn.onclick = function () {
        var marker = '【建议下一步】';
        var idx = text.indexOf(marker);
        var next = idx >= 0 ? text.slice(idx + marker.length).trim() : '';
        App.data.followups.unshift({ customerId: c.id, date: '今天', by: c.owner, summary: text, next: next });
        App.ui.closeModal();
        App.ui.toast('纪要已存入', 'ok');
        drawTimeline(c);
      };
    })();
  }

  App.registerModule({
    id: 'crm',
    nav: { section: '销转端', label: '客户管理', icon: '👥' },
    render: renderCrm
  });

})();
