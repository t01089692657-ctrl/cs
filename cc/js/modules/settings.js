/* ============ 模块：知识库与配置（系统的大脑） ============
 * 产品知识库 / FAQ 库 / 销冠话术库 / 标签与阶段 / 红线清单
 * 约定：IIFE 包裹、数据读 App.data、演示修改仅存内存、样式前缀 .mod-knowledge
 */
(function () {
  'use strict';

  var TABS = ['产品知识库', 'FAQ 库', '销冠话术库', '标签与阶段', '红线清单'];
  var state = { tab: 0 };
  var rootEl = null;

  /* ---------- 小工具 ---------- */
  function trunc(s, n) {
    s = String(s == null ? '' : s);
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  function kvRow(label, valueHtml) {
    return '<dt>' + App.esc(label) + '</dt><dd>' + valueHtml + '</dd>';
  }

  // 基于产品知识库的规则式回答草稿（正式版替换为大模型 API）
  function aiDraftAnswer(q) {
    var s = String(q).toLowerCase();
    var p = App.data.products[0];
    if (/price|how much|cost|quote|价格|多少钱|报价/.test(s)) {
      return p.name + ' FOB 青岛 ' + App.fmt.money(p.priceMin) + '–' + App.fmt.money(p.priceMax) +
        '，' + p.priceNote + '。请告诉我您的国家和用途，24 小时内给精确报价。';
    }
    if (/lead time|delivery|交期|多久/.test(s)) {
      return '参考交期：' + p.leadTime + '。旺季订单建议提前锁定排产位。';
    }
    if (/moq|起订|最小/.test(s)) {
      return p.moq + '。很多客户先订 1 套样板房验证，再下批量单。';
    }
    if (/warranty|质保|保修/.test(s)) {
      return '质保政策：' + p.warranty + '，安装类问题远程指导终身支持。';
    }
    if (/ship|freight|运费|物流|港/.test(s)) {
      return '运费按目的港实时询价，只报估算区间并注明随市场波动。' + p.name + ' 折叠平板包装，' + p.packing + '，摊到每套运费不高。告诉我您的港口，24 小时内给准确报价。';
    }
    return '感谢您的提问。以主力款 ' + p.name + '（' + p.tagline + '）为例：' + p.layout + '，' + p.structure +
      '。如需详细资料与报价，请留下您的国家与用途，我们将在 24 小时内回复。';
  }

  /* ---------- 主渲染 ---------- */
  function render(el) {
    rootEl = el;
    el.innerHTML =
      '<style>' +
      '.mod-knowledge .kn-red-row{display:flex;align-items:stretch;gap:8px;margin-bottom:8px}' +
      '.mod-knowledge .kn-red-del{cursor:pointer;color:var(--bad);font-weight:700;font-size:16px;padding:6px 10px;border-radius:8px;align-self:center;flex-shrink:0}' +
      '.mod-knowledge .kn-red-del:hover{background:var(--bad-soft)}' +
      '.mod-knowledge .kn-ol{padding-left:20px;font-size:13px;line-height:1.8}' +
      '.mod-knowledge .kn-ol li{margin-bottom:6px}' +
      '</style>' +
      '<div class="mod-knowledge">' +
      '<div class="notice">这里的内容 = 系统的大脑。把「资料模板」文件夹里的真实资料填好交给技术替换后，销冠辅助/初筛客服/技术分身全线生效。当前为示例数据。</div>' +
      '<div class="tabs">' +
      TABS.map(function (t, i) {
        return '<div class="tab' + (i === state.tab ? ' active' : '') + '" data-tab="' + i + '">' + App.esc(t) + '</div>';
      }).join('') +
      '</div>' +
      '<div id="kn-body"></div>' +
      '</div>';

    el.querySelectorAll('.mod-knowledge .tab').forEach(function (t) {
      t.onclick = function () {
        state.tab = parseInt(t.getAttribute('data-tab'), 10) || 0;
        render(rootEl);
      };
    });

    var body = el.querySelector('#kn-body');
    if (state.tab === 0) renderProducts(body);
    else if (state.tab === 1) renderFaq(body);
    else if (state.tab === 2) renderChampion(body);
    else if (state.tab === 3) renderTags(body);
    else renderRedlines(body);
  }

  /* ========== Tab 1：产品知识库 ========== */
  function renderProducts(body) {
    var list = App.data.products;
    body.innerHTML =
      '<div class="grid grid-2">' +
      list.map(function (p) {
        var price = App.fmt.money(p.priceMin) + ' – ' + App.fmt.money(p.priceMax) +
          ' <span class="muted small">（' + App.esc(p.priceNote) + '）</span>';
        var floor = (p.floorPrice == null ? '面议' : '<b>' + App.fmt.money(p.floorPrice) + '</b>') +
          ' <span class="text-bad small">仅老板与销冠可见</span>';
        return '<div class="card mb0">' +
          '<div class="card-title"><span>' + App.esc(p.name) + ' ' + App.ui.badge(p.tagline, 'accent') + '</span>' +
          '<button class="btn btn-sm" data-edit-prod="' + App.esc(p.id) + '">编辑</button></div>' +
          '<dl class="kv">' +
          kvRow('面积', App.esc(p.area)) +
          kvRow('布局', App.esc(p.layout)) +
          kvRow('结构', App.esc(p.structure)) +
          kvRow('水电', App.esc(p.electric)) +
          kvRow('卫浴', App.esc(p.bathroom)) +
          kvRow('价格区间', price) +
          kvRow('底价', floor) +
          kvRow('MOQ', App.esc(p.moq)) +
          kvRow('交期', App.esc(p.leadTime)) +
          kvRow('认证', App.esc(p.cert)) +
          kvRow('包装', App.esc(p.packing)) +
          kvRow('质保', App.esc(p.warranty)) +
          kvRow('选配', App.esc(p.options)) +
          '</dl></div>';
      }).join('') +
      '</div>';

    body.querySelectorAll('[data-edit-prod]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-edit-prod');
        var p = null;
        App.data.products.forEach(function (x) { if (x.id === id) p = x; });
        if (p) openProductModal(p);
      };
    });
  }

  function openProductModal(p) {
    App.ui.modal('编辑产品：' + p.id,
      '<div class="field"><label class="field-label">产品名称</label>' +
      '<input class="input" id="kn-p-name" value="' + App.esc(p.name) + '"></div>' +
      '<div class="row">' +
      '<div class="field" style="flex:1"><label class="field-label">价格区间下限（USD）</label>' +
      '<input class="input" id="kn-p-min" type="number" value="' + App.esc(p.priceMin) + '"></div>' +
      '<div class="field" style="flex:1"><label class="field-label">价格区间上限（USD）</label>' +
      '<input class="input" id="kn-p-max" type="number" value="' + App.esc(p.priceMax) + '"></div>' +
      '</div>' +
      '<div class="field"><label class="field-label">选配项</label>' +
      '<textarea class="textarea" id="kn-p-opt">' + App.esc(p.options) + '</textarea></div>' +
      '<div class="muted small">其余字段（结构/认证/底价等）演示版不开放编辑，正式版由「资料模板」统一维护并需权限审批。</div>',
      '<button class="btn" id="kn-p-cancel">取消</button>' +
      '<button class="btn btn-primary" id="kn-p-save">保存</button>');

    document.getElementById('kn-p-cancel').onclick = App.ui.closeModal;
    document.getElementById('kn-p-save').onclick = function () {
      var name = document.getElementById('kn-p-name').value.trim();
      var min = parseFloat(document.getElementById('kn-p-min').value);
      var max = parseFloat(document.getElementById('kn-p-max').value);
      var opt = document.getElementById('kn-p-opt').value.trim();
      if (!name) { App.ui.toast('产品名称不能为空', 'bad'); return; }
      if (isNaN(min) || isNaN(max) || min <= 0 || max < min) {
        App.ui.toast('价格区间不合法：下限需大于 0 且上限不低于下限', 'bad');
        return;
      }
      p.name = name;
      p.priceMin = min;
      p.priceMax = max;
      p.options = opt;
      App.ui.closeModal();
      App.ui.toast('已保存（演示内存生效）。正式版将写入知识库并同步全部 AI 模块', 'ok');
      render(rootEl);
    };
  }

  /* ========== Tab 2：FAQ 库 ========== */
  function renderFaq(body) {
    var faq = App.data.faq;
    body.innerHTML =
      '<div class="card">' +
      '<div class="card-title"><span>FAQ 库 <span class="sub">共 ' + faq.length + ' 条 · 初筛客服 AI 的标准弹药</span></span>' +
      '<button class="btn btn-primary btn-sm" id="kn-faq-add">新增 FAQ</button></div>' +
      App.ui.table([
        { key: 'q', label: '问题', render: function (r) { return '<b>' + App.esc(trunc(r.q, 40)) + '</b>'; } },
        { key: 'a', label: '回答', render: function (r) { return '<span class="muted">' + App.esc(trunc(r.a, 40)) + '</span>'; } },
        {
          key: 'tags', label: '标签', width: '120px', render: function (r) {
            return (r.tags || []).map(function (t) { return App.ui.chip(t); }).join('');
          }
        }
      ], faq, {
        rowAttr: function (r, i) { return 'class="clickable" data-faq="' + i + '"'; }
      }) +
      '<div class="muted small mt8">点击任意一行查看全文并编辑回答口径。</div>' +
      '</div>';

    body.querySelectorAll('tr[data-faq]').forEach(function (tr) {
      tr.onclick = function () {
        openFaqModal(parseInt(tr.getAttribute('data-faq'), 10));
      };
    });
    body.querySelector('#kn-faq-add').onclick = openFaqAddModal;
  }

  function openFaqModal(i) {
    var f = App.data.faq[i];
    if (!f) return;
    App.ui.modal('FAQ 详情',
      '<div class="mb12"><div class="field-label">问题</div>' +
      '<div class="bold" style="line-height:1.6">' + App.esc(f.q) + '</div></div>' +
      '<div class="mb12"><div class="field-label">标签</div>' +
      (f.tags || []).map(function (t) { return App.ui.chip(t); }).join('') + '</div>' +
      '<div class="field"><label class="field-label">回答（可编辑，保存后即为初筛客服 AI 的标准口径）</label>' +
      '<textarea class="textarea" id="kn-faq-edit" style="min-height:110px">' + App.esc(f.a) + '</textarea></div>',
      '<button class="btn" id="kn-faq-cancel">取消</button>' +
      '<button class="btn btn-primary" id="kn-faq-save">保存回答</button>');

    document.getElementById('kn-faq-cancel').onclick = App.ui.closeModal;
    document.getElementById('kn-faq-save').onclick = function () {
      var v = document.getElementById('kn-faq-edit').value.trim();
      if (!v) { App.ui.toast('回答不能为空', 'bad'); return; }
      f.a = v;
      App.ui.closeModal();
      App.ui.toast('回答已更新（演示内存生效），初筛客服 AI 将按新口径应答', 'ok');
      render(rootEl);
    };
  }

  function openFaqAddModal() {
    App.ui.modal('新增 FAQ',
      '<div class="field"><label class="field-label">问题（建议英文 + 中文对照）</label>' +
      '<input class="input" id="kn-faq-q" placeholder="例如：Do you ship to Europe? / 发欧洲吗？"></div>' +
      '<div class="field"><label class="field-label">回答</label>' +
      '<textarea class="textarea" id="kn-faq-a" placeholder="可手写，或点下方按钮让 AI 基于产品知识库生成草稿"></textarea></div>' +
      '<div class="field"><label class="field-label">标签（用逗号分隔）</label>' +
      '<input class="input" id="kn-faq-tags" placeholder="例如：物流,欧洲"></div>' +
      '<button class="btn btn-sm" id="kn-faq-ai"><span class="ai-tag">AI</span> 生成回答草稿</button>' +
      '<div id="kn-faq-ai-box" class="mt8"></div>',
      '<button class="btn" id="kn-faq-add-cancel">取消</button>' +
      '<button class="btn btn-primary" id="kn-faq-add-save">保存</button>');

    document.getElementById('kn-faq-add-cancel').onclick = App.ui.closeModal;

    var aiBtn = document.getElementById('kn-faq-ai');
    aiBtn.onclick = async function () {
      var q = document.getElementById('kn-faq-q').value.trim();
      if (!q) { App.ui.toast('请先填写问题，AI 才能生成对应草稿', 'bad'); return; }
      var box = document.getElementById('kn-faq-ai-box');
      aiBtn.disabled = true;
      box.innerHTML = '';
      var stop = App.ai.thinking(box, '正在检索产品知识库与 FAQ 口径…');
      await App.ai.delay(1600);
      stop();
      if (!document.getElementById('kn-faq-ai-box')) return; // 弹窗已被关闭
      var draft = aiDraftAnswer(q);
      var pre = document.createElement('div');
      pre.className = 'ai-box small';
      pre.style.lineHeight = '1.7';
      box.appendChild(pre);
      await App.ai.typeInto(pre, draft);
      var ta = document.getElementById('kn-faq-a');
      if (ta) ta.value = draft;
      aiBtn.disabled = false;
      App.ui.toast('AI 草稿已填入回答框，可再手动润色', 'ok');
    };

    document.getElementById('kn-faq-add-save').onclick = function () {
      var q = document.getElementById('kn-faq-q').value.trim();
      var a = document.getElementById('kn-faq-a').value.trim();
      var tags = document.getElementById('kn-faq-tags').value
        .split(/[，,]/)
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length > 0; });
      if (!q || !a) { App.ui.toast('问题和回答都不能为空', 'bad'); return; }
      App.data.faq.push({ q: q, a: a, tags: tags.length ? tags : ['未分类'] });
      App.ui.closeModal();
      App.ui.toast('FAQ 已新增（演示内存生效），初筛客服 AI 立即可用', 'ok');
      render(rootEl);
    };
  }

  /* ========== Tab 3：销冠话术库 ========== */
  function renderChampion(body) {
    var ch = App.data.champion;
    body.innerHTML =
      '<div class="grid grid-2">' +

      '<div class="card mb0"><div class="card-title">销冠名片</div>' +
      '<div class="row" style="align-items:flex-start">' + App.ui.avatar(ch.name) +
      '<div><div class="bold" style="font-size:15px">' + App.esc(ch.name) + '</div>' +
      '<div class="mt8">' + App.ui.badge(ch.winRate, 'ok') + '</div>' +
      '<div class="muted small mt8">他的原则与话术就是下面这套库——系统用它武装团队里的每一个人。</div>' +
      '</div></div></div>' +

      '<div class="card mb0"><div class="card-title">销冠六原则</div>' +
      '<ol class="kn-ol">' +
      ch.principles.map(function (p) { return '<li>' + App.esc(p) + '</li>'; }).join('') +
      '</ol></div>' +
      '</div>' +

      '<div class="card mt16">' +
      '<div class="card-title"><span>话术剧本 Playbook <span class="sub">共 ' + ch.playbook.length + ' 套 · 点击行查看全文</span></span></div>' +
      App.ui.table([
        { key: 'tactic', label: '策略', render: function (r) { return '<b>' + App.esc(r.tactic) + '</b>'; } },
        {
          key: 'triggers', label: '触发词', render: function (r) {
            var t = r.triggers || [];
            if (!t.length) return '<span class="badge badge-gray">通用兜底</span>';
            var h = t.slice(0, 3).map(function (x) { return App.ui.chip(x); }).join('');
            if (t.length > 3) h += '<span class="chip chip-accent">+' + (t.length - 3) + '</span>';
            return h;
          }
        },
        { key: 'scriptEn', label: '英文话术', render: function (r) { return '<span class="small">' + App.esc(trunc(r.scriptEn, 50)) + '</span>'; } },
        { key: 'scriptZh', label: '中文话术', render: function (r) { return '<span class="small muted">' + App.esc(trunc(r.scriptZh, 30)) + '</span>'; } }
      ], ch.playbook, {
        rowAttr: function (r, i) { return 'class="clickable" data-play="' + i + '"'; }
      }) +
      '</div>' +

      '<div class="notice">话术库直接驱动 WhatsApp 工作台的销冠辅助——在那边点「生成建议回复」用的就是这里的内容。</div>';

    body.querySelectorAll('tr[data-play]').forEach(function (tr) {
      tr.onclick = function () {
        openPlayModal(parseInt(tr.getAttribute('data-play'), 10));
      };
    });
  }

  function openPlayModal(i) {
    var it = App.data.champion.playbook[i];
    if (!it) return;
    var trigHtml = (it.triggers && it.triggers.length)
      ? it.triggers.map(function (t) { return App.ui.chip(t); }).join('')
      : '<span class="muted">无触发词（通用兜底：所有未命中场景使用）</span>';
    App.ui.modal('话术详情：' + it.tactic,
      '<div class="mb12"><div class="field-label">策略依据</div><div>' + App.esc(it.basis || '—') + '</div></div>' +
      '<div class="mb12"><div class="field-label">触发词（客户消息命中即推荐本话术）</div>' + trigHtml + '</div>' +
      '<div class="field"><label class="field-label">英文话术全文（可编辑，{name} 为客户名占位符）</label>' +
      '<textarea class="textarea" id="kn-play-en" style="min-height:130px">' + App.esc(it.scriptEn) + '</textarea></div>' +
      '<div class="field-label">中文话术全文（对照参考）</div>' +
      '<div class="ai-box small" style="white-space:pre-wrap;line-height:1.7">' + App.esc(it.scriptZh) + '</div>',
      '<button class="btn" id="kn-play-cancel">取消</button>' +
      '<button class="btn btn-primary" id="kn-play-save">保存英文话术</button>',
      { large: true });

    document.getElementById('kn-play-cancel').onclick = App.ui.closeModal;
    document.getElementById('kn-play-save').onclick = function () {
      var v = document.getElementById('kn-play-en').value.trim();
      if (!v) { App.ui.toast('话术不能为空', 'bad'); return; }
      it.scriptEn = v;
      App.ui.closeModal();
      App.ui.toast('英文话术已更新（演示内存生效），销冠辅助立即按新话术推荐', 'ok');
      render(rootEl);
    };
  }

  /* ========== Tab 4：标签与阶段 ========== */
  function renderTags(body) {
    var ts = App.data.tagSystem;

    function chipPlain(t) { return App.ui.chip(t); }
    function chipAcc(t) { return '<span class="chip chip-accent">' + App.esc(t) + '</span>'; }

    body.innerHTML =
      '<div class="grid grid-2">' +

      '<div class="card mb0"><div class="card-title">意向等级 <span class="sub">A/B/C/D 判定标准</span></div>' +
      App.ui.table([
        { key: 'level', label: '等级', width: '90px', render: function (r) { return App.ui.intentBadge(r.level); } },
        { key: 'name', label: '名称', width: '70px', render: function (r) { return '<b>' + App.esc(r.name) + '</b>'; } },
        { key: 'desc', label: '判定标准' }
      ], ts.intent) +
      '<div class="muted small mt8">初筛客服 AI 与批量分析按此标准自动定级，人工可随时改判。</div>' +
      '</div>' +

      '<div class="card mb0">' +
      '<div class="card-title">客户类型</div><div>' + ts.customerTypes.map(chipPlain).join('') + '</div>' +
      '<div class="card-title mt16">打标维度 <span class="sub">AI 自动打标从这些维度提取</span></div><div>' + ts.dimensions.map(chipAcc).join('') + '</div>' +
      '<div class="card-title mt16">常用标签</div><div>' + ts.common.map(chipPlain).join('') + '</div>' +
      '</div>' +
      '</div>' +

      '<div class="card mt16">' +
      '<div class="card-title">销售阶段 <span class="sub">全流程 ' + App.data.stages.length + ' 个阶段</span></div>' +
      '<div class="steps" style="margin-bottom:6px">' +
      App.data.stages.map(function (s, i) {
        return '<div class="step done"><span class="step-dot">' + (i + 1) + '</span>' + App.esc(s) + '</div>';
      }).join('<div class="step-line"></div>') +
      '</div>' +
      '<div class="muted small">说明：客户详情页可点击推进阶段，此处为全流程配置总览。</div>' +
      '</div>' +

      '<div class="row"><button class="btn" id="kn-tag-edit">调整标签体系</button></div>';

    body.querySelector('#kn-tag-edit').onclick = function () {
      App.ui.toast('演示环境：正式版将支持自定义标签/阶段并同步 CRM 与 AI 打标');
    };
  }

  /* ========== Tab 5：红线清单 ========== */
  function renderRedlines(body) {
    var reds = App.data.redlines;
    body.innerHTML =
      '<div class="card">' +
      '<div class="card-title"><span>红线清单 <span class="sub">AI 绝对不能自答 / 不能承诺的事项，共 ' + reds.length + ' 条</span></span></div>' +
      reds.map(function (r, i) {
        return '<div class="kn-red-row">' +
          '<div class="notice notice-bad" style="flex:1;margin-bottom:0">' + App.esc(r) + '</div>' +
          '<span class="kn-red-del" data-del-red="' + i + '" title="删除该红线">×</span>' +
          '</div>';
      }).join('') +
      '<div class="row mt12">' +
      '<input class="input" id="kn-red-input" style="flex:1" placeholder="新增红线，例如：不承诺任何未经技术评估的荷载参数">' +
      '<button class="btn btn-primary" id="kn-red-add">新增红线</button>' +
      '</div>' +
      '<div class="notice mt12" style="margin-bottom:0">红线同步约束：初筛客服 AI（拒答转人工）与销冠辅助（不生成违规话术）。</div>' +
      '</div>';

    body.querySelectorAll('[data-del-red]').forEach(function (x) {
      x.onclick = function () {
        var i = parseInt(x.getAttribute('data-del-red'), 10);
        if (window.confirm('确认删除这条红线？删除后 AI 将不再受它约束（仅演示内存生效）。')) {
          App.data.redlines.splice(i, 1);
          App.ui.toast('红线已删除（演示内存生效），AI 约束同步更新', 'ok');
          render(rootEl);
        }
      };
    });

    function addRedline() {
      var inp = body.querySelector('#kn-red-input');
      var v = inp.value.trim();
      if (!v) { App.ui.toast('请先输入红线内容', 'bad'); return; }
      App.data.redlines.push(v);
      App.ui.toast('红线已新增（演示内存生效），初筛客服与销冠辅助即时受约束', 'ok');
      render(rootEl);
    }
    body.querySelector('#kn-red-add').onclick = addRedline;
    body.querySelector('#kn-red-input').onkeydown = function (e) {
      if (e.key === 'Enter') addRedline();
    };
  }

  /* ---------- 注册 ---------- */
  App.registerModule({
    id: 'knowledge',
    nav: { section: '系统设置', label: '知识库与配置', icon: '⚙️' },
    render: render
  });
})();
