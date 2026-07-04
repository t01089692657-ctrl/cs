/* ============ 模块：视频号视频工厂 ============
 * 定位：企业不拍摄、不出镜，用固定模板 + 产品素材批量产出营销视频，投喂视频号。
 * 数据来源：App.data.videoTemplates / App.data.videoQueue / App.data.products / App.data.kpis
 * 约定：IIFE 包裹、样式前缀 .mod-video-factory、事件绑定在 innerHTML 之后。
 */
(function () {
  'use strict';

  /* ---------- 模块私有数据 ---------- */
  var SELL_POINTS = ['价格优势', '交期', '保温性能', '卫浴预装', '10年质保', '折叠运输省运费'];
  var SELL_EN = {
    '价格优势': 'Factory-direct pricing',
    '交期': 'Fast lead time',
    '保温性能': 'Superior insulation',
    '卫浴预装': 'Bathroom pre-installed',
    '10年质保': '10-year structural warranty',
    '折叠运输省运费': 'Folding design cuts freight cost'
  };

  /* ---------- 模块私有状态 ---------- */
  var state = { tab: 'tpl' };            // tpl | wiz | queue
  var wiz = newWiz();
  var rootEl = null;

  function newWiz() {
    return { step: 1, templateId: null, productId: null, points: [], lang: '双语', rows: null };
  }

  function findTemplate(id) {
    var list = App.data.videoTemplates;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function findProduct(id) {
    var list = App.data.products;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ---------- 入口 ---------- */
  function render(el) {
    rootEl = el;
    draw();
  }

  function draw() {
    var q = App.data.videoQueue;
    var pending = q.filter(function (v) { return v.status === '待审核'; }).length;
    var views = 0, leads = 0;
    q.forEach(function (v) { views += (v.views || 0); leads += (v.leads || 0); });

    var tabs = [
      { key: 'tpl', label: '模板库' },
      { key: 'wiz', label: 'AI 生成向导' },
      { key: 'queue', label: '视频队列' }
    ];

    rootEl.innerHTML =
      '<style>' +
      '.mod-video-factory .vf-tpl{display:flex;flex-direction:column}' +
      '.mod-video-factory .vf-struct{background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin:10px 0;flex:1}' +
      '.mod-video-factory .vf-struct div{font-size:12.5px;color:var(--muted);line-height:1.9}' +
      '.mod-video-factory .vf-choice{border:1px solid var(--line);border-radius:10px;padding:12px 14px;cursor:pointer;transition:all .15s;background:#fff}' +
      '.mod-video-factory .vf-choice:hover{border-color:var(--accent)}' +
      '.mod-video-factory .vf-choice.on{border-color:var(--accent);background:var(--accent-soft);box-shadow:0 0 0 1px var(--accent)}' +
      '.mod-video-factory .vf-chk{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:8px;padding:6px 12px;margin:0 8px 8px 0;cursor:pointer;font-size:13px;background:#fff;user-select:none}' +
      '.mod-video-factory .vf-chk.on{border-color:var(--accent);background:var(--accent-soft);color:var(--accent);font-weight:600}' +
      '.mod-video-factory .vf-ta{width:100%;min-height:54px;border:1px solid var(--line);border-radius:6px;font-size:12.5px;padding:6px 8px;font-family:inherit;resize:vertical;line-height:1.5;color:var(--ink)}' +
      '.mod-video-factory .vf-ta:focus{border-color:var(--accent);outline:none}' +
      '.mod-video-factory .vf-sb td{vertical-align:top}' +
      '</style>' +
      '<div class="mod-video-factory">' +

      // KPI 行
      '<div class="grid grid-4 mb12">' +
      App.ui.kpi('本周产量', App.data.kpis.videosWeek, '固定模板批量产出') +
      App.ui.kpi('待审核', pending, pending > 0 ? '<span class="text-warn">等待人工审核发布</span>' : '暂无积压') +
      App.ui.kpi('累计播放', App.fmt.num(views), '视频号全部已发布视频') +
      App.ui.kpi('视频带来线索', leads, '<span class="text-ok">进入线索池</span>') +
      '</div>' +

      // Tabs
      '<div class="tabs">' +
      tabs.map(function (t) {
        return '<div class="tab' + (state.tab === t.key ? ' active' : '') + '" data-tab="' + t.key + '">' + t.label + '</div>';
      }).join('') +
      '</div>' +

      '<div id="vf-body"></div>' +

      // 底部 notice
      '<div class="notice mt16">正式版流水线：AI 脚本 → 程序化模板剪辑 → 人工审核 → 定时发布 → 数据回流优化选题。' +
      '当前为演示环境，合成与发布动作仅做流程演示，不产生真实视频文件。</div>' +

      '</div>';

    // Tab 切换事件
    rootEl.querySelectorAll('.mod-video-factory .tab').forEach(function (t) {
      t.onclick = function () {
        state.tab = t.getAttribute('data-tab');
        draw();
      };
    });

    drawBody();
  }

  function drawBody() {
    var body = rootEl.querySelector('#vf-body');
    if (state.tab === 'tpl') drawTemplates(body);
    else if (state.tab === 'wiz') drawWizard(body);
    else drawQueue(body);
  }

  /* ================= Tab 1：模板库 ================= */
  function drawTemplates(body) {
    var tpls = App.data.videoTemplates;
    body.innerHTML =
      '<div class="grid grid-2">' +
      tpls.map(function (t) {
        return '<div class="card mb0 vf-tpl">' +
          '<div class="card-title">' + App.esc(t.name) + App.ui.badge(t.duration, 'accent') + '</div>' +
          '<div class="small muted">适用：' + App.esc(t.bestFor) + '</div>' +
          '<div class="vf-struct">' +
          t.structure.map(function (s, i) {
            return '<div>' + (i + 1) + '. ' + App.esc(s) + '</div>';
          }).join('') +
          '</div>' +
          '<div class="row">' +
          '<button class="btn btn-sm" data-act="sample" data-id="' + App.esc(t.id) + '">查看示例分镜</button>' +
          '<button class="btn btn-sm btn-primary" data-act="use" data-id="' + App.esc(t.id) + '">用此模板生成</button>' +
          '</div>' +
          '</div>';
      }).join('') +
      '</div>';

    body.querySelectorAll('button[data-act]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-id');
        if (b.getAttribute('data-act') === 'sample') showSampleModal(id);
        else useTemplate(id);
      };
    });
  }

  function useTemplate(id) {
    var t = findTemplate(id);
    if (!t) return;
    wiz = newWiz();
    wiz.templateId = id;
    state.tab = 'wiz';
    draw();
    App.ui.toast('已选择模板「' + t.name + '」，请继续完成向导');
  }

  function showSampleModal(id) {
    var t = findTemplate(id);
    if (!t) return;
    var tableHtml = '<div style="overflow-x:auto">' + App.ui.table([
      { key: 'shot', label: '镜头', width: '70px', render: function (r) { return '<b>' + App.esc(r.shot) + '</b>'; } },
      { key: 'visual', label: '画面', render: function (r) { return App.esc(r.visual); } },
      { key: 'zh', label: '中文字幕', render: function (r) { return App.esc(r.zh) || '-'; } },
      { key: 'en', label: '英文字幕', render: function (r) { return '<span class="small">' + App.esc(r.en) + '</span>'; } },
      { key: 'vo', label: '配音', render: function (r) { return r.vo ? App.esc(r.vo) : '<span class="muted">-</span>'; } }
    ], t.sample) + '</div>';

    App.ui.modal(
      t.name + ' · 示例分镜',
      '<div class="small muted mb8">时长 ' + App.esc(t.duration) + ' · ' + App.esc(t.bestFor) + '</div>' + tableHtml,
      '<button class="btn" id="vf-modal-close">关闭</button>' +
      '<button class="btn btn-primary" id="vf-modal-use">用此模板生成</button>',
      { large: true }
    );
    document.getElementById('vf-modal-close').onclick = App.ui.closeModal;
    document.getElementById('vf-modal-use').onclick = function () {
      App.ui.closeModal();
      useTemplate(id);
    };
  }

  /* ================= Tab 2：AI 生成向导 ================= */
  function stepsBar(cur) {
    var labels = ['选模板', '选产品与卖点', 'AI 生成脚本', '提交合成'];
    return '<div class="steps">' +
      labels.map(function (lb, i) {
        var n = i + 1;
        var cls = n === cur ? 'step active' : (n < cur ? 'step done' : 'step');
        var dot = n < cur ? '✓' : n;
        return '<div class="' + cls + '"><span class="step-dot">' + dot + '</span>' + lb + '</div>' +
          (n < labels.length ? '<div class="step-line"></div>' : '');
      }).join('') +
      '</div>';
  }

  function drawWizard(body) {
    var html = '<div class="card mb0">' + stepsBar(wiz.step);

    if (wiz.step === 1) html += wizStep1Html();
    else if (wiz.step === 2) html += wizStep2Html();
    else if (wiz.step === 3) html += wizStep3Html();
    else html += wizStep4Html();

    html += '</div>';
    body.innerHTML = html;
    bindWizardEvents(body);
  }

  /* ---- 第①步：选模板 ---- */
  function wizStep1Html() {
    return '<div class="small muted mb12">第一步：选择一个视频模板（单选）</div>' +
      '<div class="grid grid-2">' +
      App.data.videoTemplates.map(function (t) {
        var on = wiz.templateId === t.id;
        return '<div class="vf-choice' + (on ? ' on' : '') + '" data-tid="' + App.esc(t.id) + '">' +
          '<div class="row-between"><b>' + App.esc(t.name) + '</b>' + App.ui.badge(t.duration, on ? 'accent' : 'gray') + '</div>' +
          '<div class="small muted mt8">' + App.esc(t.bestFor) + '</div>' +
          '</div>';
      }).join('') +
      '</div>' +
      '<div class="row mt16" style="justify-content:flex-end">' +
      '<button class="btn btn-primary" id="vf-next-1">下一步：选产品与卖点 →</button>' +
      '</div>';
  }

  /* ---- 第②步：选产品 + 卖点 + 字幕语言 ---- */
  function wizStep2Html() {
    var langs = ['中文', '英文', '双语'];
    return '<div class="small muted mb12">第二步：选择产品（单选）、勾选要突出的卖点、选择字幕语言</div>' +

      '<div class="field-label">产品</div>' +
      '<div class="grid grid-2 mb12">' +
      App.data.products.map(function (p) {
        var on = wiz.productId === p.id;
        var price = p.priceMin != null ? App.fmt.money(p.priceMin) + ' – ' + App.fmt.money(p.priceMax) : '按图报价';
        return '<div class="vf-choice' + (on ? ' on' : '') + '" data-pid="' + App.esc(p.id) + '">' +
          '<div class="row-between"><b>' + App.esc(p.name) + '</b>' + App.ui.badge(p.tagline, on ? 'accent' : 'gray') + '</div>' +
          '<div class="small muted mt8">' + price + ' · ' + App.esc(p.leadTime) + '</div>' +
          '</div>';
      }).join('') +
      '</div>' +

      '<div class="field-label">突出卖点（可多选）</div>' +
      '<div class="mb12">' +
      SELL_POINTS.map(function (sp) {
        var on = wiz.points.indexOf(sp) >= 0;
        return '<label class="vf-chk' + (on ? ' on' : '') + '" data-sp="' + App.esc(sp) + '">' +
          '<input type="checkbox" ' + (on ? 'checked' : '') + ' style="accent-color:var(--accent)"> ' + App.esc(sp) +
          '</label>';
      }).join('') +
      '</div>' +

      '<div class="field" style="max-width:220px">' +
      '<label class="field-label">字幕语言</label>' +
      '<select class="select" id="vf-lang">' +
      langs.map(function (l) {
        return '<option value="' + l + '"' + (wiz.lang === l ? ' selected' : '') + '>' + l + '</option>';
      }).join('') +
      '</select>' +
      '</div>' +

      '<div class="row mt16" style="justify-content:space-between">' +
      '<button class="btn" id="vf-prev-2">← 上一步</button>' +
      '<button class="btn btn-primary" id="vf-next-2">下一步：AI 生成脚本 →</button>' +
      '</div>';
  }

  /* ---- 第③步：AI 生成脚本 ---- */
  function wizStep3Html() {
    var t = findTemplate(wiz.templateId);
    var p = findProduct(wiz.productId);
    return '<div class="row-between mb12">' +
      '<div class="small muted">第三步：基于「' + App.esc(t ? t.name : '') + '」为 ' + App.esc(p ? p.name : '') + ' 生成分镜脚本</div>' +
      '<span class="badge badge-purple">可直接修改，AI 生成仅供起点</span>' +
      '</div>' +
      '<div class="row mb12">' +
      '<button class="btn btn-primary" id="vf-gen">✨ AI 生成脚本</button>' +
      (wiz.rows ? '<span class="small muted">已生成 ' + wiz.rows.length + ' 组分镜，可在下方直接编辑字幕</span>' : '') +
      '</div>' +
      '<div id="vf-gen-box">' + (wiz.rows ? '<div id="vf-sb"></div>' : App.ui.empty('点击上方按钮，AI 将基于模板结构与产品资料生成分镜脚本', '🎬')) + '</div>' +
      '<div class="row mt16" style="justify-content:space-between">' +
      '<button class="btn" id="vf-prev-3">← 上一步</button>' +
      '<button class="btn btn-primary" id="vf-next-3">下一步：提交合成 →</button>' +
      '</div>';
  }

  /* ---- 第④步：提交合成 ---- */
  function wizStep4Html() {
    var t = findTemplate(wiz.templateId);
    var p = findProduct(wiz.productId);
    var title = (p ? p.name : '') + ' · ' + (t ? t.name : '');
    return '<div class="small muted mb12">第四步：确认信息并提交合成</div>' +
      '<div class="ai-box mb12">' +
      '<dl class="kv">' +
      '<dt>视频标题</dt><dd><b>' + App.esc(title) + '</b></dd>' +
      '<dt>模板</dt><dd>' + App.esc(t ? t.name + '（' + t.duration + '）' : '-') + '</dd>' +
      '<dt>产品</dt><dd>' + App.esc(p ? p.name : '-') + '</dd>' +
      '<dt>突出卖点</dt><dd>' + (wiz.points.length ? wiz.points.map(function (sp) { return App.ui.badge(sp, 'accent'); }).join(' ') : '<span class="muted">未勾选</span>') + '</dd>' +
      '<dt>字幕语言</dt><dd>' + App.esc(wiz.lang) + '</dd>' +
      '<dt>分镜数</dt><dd>' + (wiz.rows ? wiz.rows.length + ' 组' : '-') + '</dd>' +
      '</dl>' +
      '</div>' +
      '<div class="notice">提交后视频进入合成队列，状态为「待审核」，人工审核通过后才会发布到视频号。</div>' +
      '<div class="row mt16" style="justify-content:space-between">' +
      '<button class="btn" id="vf-prev-4">← 上一步</button>' +
      '<button class="btn btn-ok" id="vf-submit">🚀 提交合成</button>' +
      '</div>';
  }

  /* ---- 向导事件绑定 ---- */
  function bindWizardEvents(body) {
    // 第①步
    body.querySelectorAll('[data-tid]').forEach(function (c) {
      c.onclick = function () {
        wiz.templateId = c.getAttribute('data-tid');
        drawBody();
      };
    });
    var next1 = body.querySelector('#vf-next-1');
    if (next1) next1.onclick = function () {
      if (!wiz.templateId) { App.ui.toast('请先选择一个模板', 'bad'); return; }
      wiz.step = 2; drawBody();
    };

    // 第②步
    body.querySelectorAll('[data-pid]').forEach(function (c) {
      c.onclick = function () {
        wiz.productId = c.getAttribute('data-pid');
        wiz.rows = null; // 换产品后旧脚本作废
        drawBody();
      };
    });
    body.querySelectorAll('.vf-chk').forEach(function (lb) {
      var sp = lb.getAttribute('data-sp');
      var cb = lb.querySelector('input');
      cb.onchange = function () {
        var i = wiz.points.indexOf(sp);
        if (cb.checked && i < 0) wiz.points.push(sp);
        if (!cb.checked && i >= 0) wiz.points.splice(i, 1);
        lb.classList.toggle('on', cb.checked);
        wiz.rows = null;
      };
    });
    var langSel = body.querySelector('#vf-lang');
    if (langSel) langSel.onchange = function () { wiz.lang = langSel.value; wiz.rows = null; };
    var prev2 = body.querySelector('#vf-prev-2');
    if (prev2) prev2.onclick = function () { wiz.step = 1; drawBody(); };
    var next2 = body.querySelector('#vf-next-2');
    if (next2) next2.onclick = function () {
      if (!wiz.productId) { App.ui.toast('请先选择一个产品', 'bad'); return; }
      wiz.step = 3; drawBody();
    };

    // 第③步
    var genBtn = body.querySelector('#vf-gen');
    if (genBtn) genBtn.onclick = function () { generateScript(genBtn); };
    if (wiz.rows && body.querySelector('#vf-sb')) renderStoryboard(body.querySelector('#vf-sb'));
    var prev3 = body.querySelector('#vf-prev-3');
    if (prev3) prev3.onclick = function () { wiz.step = 2; drawBody(); };
    var next3 = body.querySelector('#vf-next-3');
    if (next3) next3.onclick = function () {
      if (!wiz.rows) { App.ui.toast('请先点击「AI 生成脚本」', 'bad'); return; }
      wiz.step = 4; drawBody();
    };

    // 第④步
    var prev4 = body.querySelector('#vf-prev-4');
    if (prev4) prev4.onclick = function () { wiz.step = 3; drawBody(); };
    var submit = body.querySelector('#vf-submit');
    if (submit) submit.onclick = submitVideo;
  }

  /* ---- AI 脚本生成 ---- */
  function adaptText(text, p) {
    if (!text) return '';
    var t = String(text);
    // 替换带千分位的产品价格（$8,500 之类），不动 $120/晚 这类小数字
    if (p.priceMin != null) {
      t = t.replace(/\$\d{1,3}(?:,\d{3})+/g, App.fmt.money(p.priceMin));
    }
    // 替换产品型号
    t = t.replace(/EH-20|EH-40|FD-13|CH-P/g, p.id);
    // 替换面积（36㎡ → 所选产品面积）
    var m = String(p.area || '').match(/([\d.]+)\s*㎡/);
    if (m) t = t.replace(/\d+(?:\.\d+)?㎡/g, m[1] + '㎡');
    return t;
  }

  function buildRows() {
    var t = findTemplate(wiz.templateId);
    var p = findProduct(wiz.productId);
    if (!t || !p) return null;
    var rows = t.sample.map(function (s) {
      return {
        shot: s.shot,
        visual: adaptText(s.visual, p),
        zh: adaptText(s.zh, p),
        en: adaptText(s.en, p),
        vo: adaptText(s.vo, p)
      };
    });
    // 有勾选卖点时，在落版镜头前插入一组卖点强化分镜
    if (wiz.points.length) {
      rows.splice(rows.length - 1, 0, {
        shot: '卖点强化',
        visual: p.id + ' 产品素材 + 动态字幕卡',
        zh: wiz.points.join(' · '),
        en: wiz.points.map(function (sp) { return SELL_EN[sp] || sp; }).join('. '),
        vo: 'AI配音：' + wiz.points.join('、')
      });
    }
    return rows;
  }

  async function generateScript(btn) {
    var box = rootEl.querySelector('#vf-gen-box');
    if (!box) return;
    var t = findTemplate(wiz.templateId);
    var p = findProduct(wiz.productId);
    btn.disabled = true;
    box.innerHTML = '';
    var stop = App.ai.thinking(box, '正在解析「' + (t ? t.name : '') + '」模板结构，套入 ' + (p ? p.name : '') + ' 的产品资料与卖点…');
    await App.ai.delay(1600);
    stop();
    btn.disabled = false;

    wiz.rows = buildRows();
    if (!wiz.rows) { App.ui.toast('生成失败：模板或产品数据缺失', 'bad'); return; }

    box.innerHTML =
      '<div class="ai-box mb12"><div class="row" style="gap:8px;align-items:flex-start">' +
      '<span class="ai-tag">AI</span><span class="small" id="vf-gen-note" style="line-height:1.7"></span>' +
      '</div></div>' +
      '<div id="vf-sb"></div>';

    var note = '已基于「' + (t ? t.name : '') + '」为 ' + (p ? p.name : '') + ' 生成 ' + wiz.rows.length +
      ' 组分镜，字幕语言：' + wiz.lang +
      (wiz.points.length ? '，已融入卖点：' + wiz.points.join('、') : '') +
      '。字幕单元格可直接编辑，改完进入下一步提交合成。';
    await App.ai.typeInto(box.querySelector('#vf-gen-note'), note);
    renderStoryboard(box.querySelector('#vf-sb'));
  }

  function renderStoryboard(container) {
    if (!container || !wiz.rows) return;
    var showZh = wiz.lang !== '英文';
    var showEn = wiz.lang !== '中文';

    var h = '<div style="overflow-x:auto"><table class="tbl vf-sb"><thead><tr>' +
      '<th style="width:80px">镜头</th><th>画面</th>' +
      (showZh ? '<th style="width:22%">中文字幕</th>' : '') +
      (showEn ? '<th style="width:24%">英文字幕</th>' : '') +
      '<th style="width:18%">配音</th>' +
      '</tr></thead><tbody>';

    wiz.rows.forEach(function (r, i) {
      h += '<tr>' +
        '<td><b>' + App.esc(r.shot) + '</b></td>' +
        '<td><span class="small">' + App.esc(r.visual) + '</span></td>' +
        (showZh ? '<td><textarea class="vf-ta" data-idx="' + i + '" data-field="zh">' + App.esc(r.zh) + '</textarea></td>' : '') +
        (showEn ? '<td><textarea class="vf-ta" data-idx="' + i + '" data-field="en">' + App.esc(r.en) + '</textarea></td>' : '') +
        '<td><span class="small muted">' + (r.vo ? App.esc(r.vo) : '-') + '</span></td>' +
        '</tr>';
    });
    h += '</tbody></table></div>';
    container.innerHTML = h;

    container.querySelectorAll('.vf-ta').forEach(function (ta) {
      ta.oninput = function () {
        var idx = parseInt(ta.getAttribute('data-idx'), 10);
        var field = ta.getAttribute('data-field');
        if (wiz.rows && wiz.rows[idx]) wiz.rows[idx][field] = ta.value;
      };
    });
  }

  /* ---- 提交合成 ---- */
  function submitVideo() {
    var t = findTemplate(wiz.templateId);
    var p = findProduct(wiz.productId);
    if (!t || !p || !wiz.rows) { App.ui.toast('信息不完整，无法提交', 'bad'); return; }
    App.data.videoQueue.unshift({
      id: 'v' + Date.now(),
      title: p.name + ' · ' + t.name,
      template: t.name,
      status: '待审核',
      date: '今天',
      views: 0,
      likes: 0,
      leads: 0
    });
    wiz = newWiz();
    state.tab = 'queue';
    draw();
    App.ui.toast('已进入合成队列（演示环境：正式版调用程序化剪辑引擎）', 'ok');
  }

  /* ================= Tab 3：视频队列 ================= */
  function drawQueue(body) {
    var statusType = { '草稿': 'gray', '待审核': 'warn', '已发布': 'ok' };
    var q = App.data.videoQueue;

    body.innerHTML =
      '<div class="card mb0">' +
      '<div class="card-title">合成与发布队列 <span class="sub">共 ' + q.length + ' 条 · 审核通过后自动发布到视频号</span></div>' +
      App.ui.table([
        { key: 'title', label: '标题', render: function (r) { return '<b>' + App.esc(r.title) + '</b>'; } },
        { key: 'template', label: '模板', render: function (r) { return '<span class="small muted">' + App.esc(r.template) + '</span>'; } },
        { key: 'status', label: '状态', render: function (r) { return App.ui.badge(r.status, statusType[r.status] || 'gray'); } },
        { key: 'date', label: '日期' },
        { key: 'views', label: '播放', render: function (r) { return App.fmt.num(r.views); } },
        { key: 'likes', label: '点赞', render: function (r) { return App.fmt.num(r.likes); } },
        { key: 'leads', label: '线索', render: function (r) { return r.leads > 0 ? '<b class="text-ok">' + r.leads + '</b>' : '0'; } },
        {
          key: 'op', label: '操作', render: function (r, idx) {
            if (r.status === '待审核') return '<button class="btn btn-sm btn-primary" data-act="approve" data-idx="' + idx + '">审核通过并发布</button>';
            if (r.status === '草稿') return '<button class="btn btn-sm" data-act="edit" data-idx="' + idx + '">继续编辑</button>';
            return '<span class="muted">-</span>';
          }
        }
      ], q, { emptyMsg: '队列为空，去「AI 生成向导」产出第一条视频吧' }) +
      '</div>';

    body.querySelectorAll('button[data-act]').forEach(function (b) {
      b.onclick = function () {
        var idx = parseInt(b.getAttribute('data-idx'), 10);
        var item = App.data.videoQueue[idx];
        if (!item) return;
        if (b.getAttribute('data-act') === 'approve') {
          item.status = '已发布';
          draw(); // 刷新 KPI 与列表
          App.ui.toast('已发布（演示环境：正式版对接视频号发布接口）', 'ok');
        } else {
          App.ui.toast('演示环境：正式版将打开脚本编辑器继续编辑该草稿');
        }
      };
    });
  }

  /* ---------- 注册模块 ---------- */
  App.registerModule({
    id: 'video-factory',
    nav: { section: '流量端', label: '视频号视频工厂', icon: '🎬' },
    render: render
  });
})();
