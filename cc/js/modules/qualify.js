/* ============ 模块：初筛客服 AI ============
 * 新线索进线后，AI 接住前 5-10 个问题：答基础问题、反问收集画像、
 * 完成初筛后带完整画像转人工。左栏实况演示，右栏 AI 弹药库配置。
 */
(function () {
  'use strict';

  var PROFILE_FIELDS = ['国家/城市', '采购用途', '数量规模', '预算区间', '时间线', '决策角色'];

  function render(el) {
    var d = App.data;
    var lead = d.qualifyDemo.lead;

    /* ---------- 播放状态（模块内私有，切页即重置） ---------- */
    var playToken = 0;
    var handedOff = false;

    el.innerHTML =
      '<style>' +
      '.mod-qualify .q-grid{display:grid;grid-template-columns:55fr 45fr;gap:16px;align-items:start}' +
      '.mod-qualify .q-chat{height:430px;overflow-y:auto;padding:14px;background:#f7f9fc;border:1px solid var(--line);border-radius:8px}' +
      '.mod-qualify .q-msg-ai{display:flex;flex-direction:column;align-items:flex-end;max-width:80%}' +
      '.mod-qualify .q-msg-ai .ai-tag{margin-bottom:4px;font-size:10px;padding:1px 6px}' +
      '.mod-qualify .q-msg-ai .bubble{max-width:100%}' +
      '.mod-qualify .q-profile{animation:qualifySlideUp .35s ease}' +
      '@keyframes qualifySlideUp{from{transform:translateY(14px);opacity:0}}' +
      '.mod-qualify .q-redline{margin-bottom:8px;font-size:12px;padding:7px 11px;line-height:1.6}' +
      '.mod-qualify .q-check{display:flex;align-items:center;gap:8px;padding:6px 2px;font-size:13px;cursor:pointer}' +
      '.mod-qualify .q-rule{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #f1f3f7}' +
      '.mod-qualify .q-rule:last-of-type{border-bottom:none}' +
      '@media (max-width:1100px){.mod-qualify .q-grid{grid-template-columns:1fr}}' +
      '</style>' +

      '<div class="mod-qualify"><div class="q-grid">' +

      /* ================= 左栏 · 实况演示 ================= */
      '<div>' +
      '<div class="notice">以下为一条广告线索进线后的全自动初筛过程演示</div>' +

      '<div class="card">' +
      '<div class="card-title">' +
      '<span class="row" style="gap:10px">' + App.ui.avatar(lead.name) +
      '<span>' + App.esc(lead.name) + ' <span class="sub">' + App.esc(lead.country) + '</span></span>' +
      App.ui.badge(lead.source, 'accent') +
      '</span>' +
      '<span class="sub">AI 客服自动接待中</span>' +
      '</div>' +

      '<div class="chat-wrap q-chat" id="q-chat">' +
      App.ui.empty('点击下方「▶ 播放演示」，观看 AI 从进线到转人工的完整初筛过程', '🤖') +
      '</div>' +

      '<div class="row mt12" style="gap:10px">' +
      '<button class="btn btn-primary" id="q-play">▶ 播放演示</button>' +
      '<button class="btn" id="q-replay">重新演示</button>' +
      '<span class="small muted">全程无人值守 · 约 30 秒</span>' +
      '</div>' +

      '<div id="q-profile-wrap" class="mt12"></div>' +
      '</div>' +
      '</div>' +

      /* ================= 右栏 · AI 弹药库配置 ================= */
      '<div>' +
      '<div class="card" id="q-faq-card"></div>' +

      // 红线清单卡
      '<div class="card">' +
      '<div class="card-title">红线清单 <span class="sub">共 ' + d.redlines.length + ' 条</span></div>' +
      '<div class="small muted mb8">命中红线 → 自动转人工，AI 绝不自答</div>' +
      d.redlines.map(function (r) {
        return '<div class="notice notice-bad q-redline mb0">' + App.esc(r) + '</div>';
      }).join('') +
      '</div>' +

      // 画像收集字段卡
      '<div class="card">' +
      '<div class="card-title">画像收集字段 <span class="sub">AI 会在对话中自然反问收集</span></div>' +
      PROFILE_FIELDS.map(function (f, i) {
        return '<label class="q-check"><input type="checkbox" checked data-qf="' + i + '"> ' + App.esc(f) + '</label>';
      }).join('') +
      '</div>' +

      // 转人工规则卡
      '<div class="card">' +
      '<div class="card-title">转人工规则 <span class="sub">4 种情况自动转接</span></div>' +
      [
        { t: '命中红线清单', s: '涉及底价、账期、独家代理、结构安全等红线话题，AI 立即停答并转人工' },
        { t: '问题超出 FAQ 覆盖', s: '知识库无匹配答案时绝不编造，礼貌留住客户并转人工' },
        { t: '客户明确要求人工', s: '客户提出要与真人/销售沟通时，无条件立即转接' },
        { t: '画像收集完成即转', s: '关键字段集齐后自动评级，带完整画像转给对应业务员' }
      ].map(function (r, i) {
        return '<div class="q-rule">' +
          '<span class="step-dot" style="flex-shrink:0">' + (i + 1) + '</span>' +
          '<span><span class="bold">' + App.esc(r.t) + '</span>' +
          '<div class="small muted" style="margin-top:2px;line-height:1.6">' + App.esc(r.s) + '</div></span>' +
          '</div>';
      }).join('') +
      '<div class="notice mt12 mb0">AI 只做初筛，成交永远由人来谈。</div>' +
      '</div>' +

      '</div>' +
      '</div></div>';

    var chatEl = el.querySelector('#q-chat');
    var playBtn = el.querySelector('#q-play');
    var replayBtn = el.querySelector('#q-replay');
    var profileWrap = el.querySelector('#q-profile-wrap');

    /* ---------- 左栏：聊天上屏工具 ---------- */
    function scrollBottom() { chatEl.scrollTop = chatEl.scrollHeight; }

    function appendCustomer(text) {
      var row = document.createElement('div');
      row.className = 'msg-row them';
      row.innerHTML = App.ui.avatar(lead.name, true) +
        '<div class="bubble">' + App.esc(text) + '</div>';
      chatEl.appendChild(row);
      scrollBottom();
    }

    function appendAiBubble() {
      var row = document.createElement('div');
      row.className = 'msg-row me';
      row.innerHTML = '<div class="q-msg-ai"><span class="ai-tag">AI 客服</span><div class="bubble"></div></div>';
      chatEl.appendChild(row);
      scrollBottom();
      return row.querySelector('.bubble');
    }

    /* ---------- 左栏：画像卡 ---------- */
    function showProfileCard() {
      var p = App.data.qualifyDemo.profile;
      profileWrap.innerHTML =
        '<div class="ai-box q-profile">' +
        '<div class="row mb8" style="gap:8px"><span class="ai-tag">AI</span><span class="bold">画像收集完成</span>' +
        '<span class="small muted">对话 ' + App.data.qualifyDemo.conversation.length + ' 轮 · 关键字段已集齐</span></div>' +
        '<dl class="kv">' +
        '<dt>姓名</dt><dd>' + App.esc(p.name) + '</dd>' +
        '<dt>国家</dt><dd>' + App.esc(p.country) + '</dd>' +
        '<dt>用途</dt><dd>' + App.esc(p.usage) + '</dd>' +
        '<dt>数量</dt><dd>' + App.esc(p.qty) + '</dd>' +
        '<dt>预算</dt><dd>' + App.esc(p.budget) + '</dd>' +
        '<dt>时间线</dt><dd>' + App.esc(p.timeline) + '</dd>' +
        '</dl>' +
        '<div class="row mt8" style="gap:8px"><span class="small muted">意向评级</span>' +
        App.ui.badge(p.intent + ' · 有意向', 'warn') + '</div>' +
        '<div class="small mt8" style="line-height:1.7"><span class="bold">AI 建议：</span>' + App.esc(p.suggestion) + '</div>' +
        '<div class="mt12"><button class="btn btn-primary btn-sm" id="q-handoff"' +
        (handedOff ? ' disabled' : '') + '>' + (handedOff ? '已转入线索池 ✓' : '转人工并入线索池') + '</button></div>' +
        '</div>';

      var btn = profileWrap.querySelector('#q-handoff');
      btn.onclick = function () {
        if (handedOff) return;
        App.data.leadsPool.unshift({
          id: 'lq' + Date.now(),
          name: 'Sarah Brown', country: '英国', source: '广告投放',
          time: '刚刚', msg: '花园办公室 · $10-12k · 10月前',
          status: '未分配', owner: null
        });
        handedOff = true;
        btn.disabled = true;
        btn.textContent = '已转入线索池 ✓';
        App.ui.toast('已转人工，线索池可见完整画像', 'ok');
      };
      btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    /* ---------- 左栏：播放主流程 ---------- */
    async function play() {
      var token = ++playToken;
      playBtn.disabled = true;
      playBtn.textContent = '演示中…';
      chatEl.innerHTML = '';
      profileWrap.innerHTML = '';

      var conv = App.data.qualifyDemo.conversation;
      for (var i = 0; i < conv.length; i++) {
        if (token !== playToken) return;
        var m = conv[i];
        if (m.from === 'c') {
          appendCustomer(m.text);
          await App.ai.delay(1000);
        } else {
          var tRow = document.createElement('div');
          tRow.className = 'msg-row me';
          chatEl.appendChild(tRow);
          var stop = App.ai.thinking(tRow, 'AI 正在组织回复…');
          scrollBottom();
          await App.ai.delay(800);
          stop();
          tRow.remove();
          if (token !== playToken) return;
          var bubble = appendAiBubble();
          await App.ai.typeInto(bubble, m.text, 80);
          if (token !== playToken) return;
          scrollBottom();
          await App.ai.delay(1000);
        }
      }
      if (token !== playToken) return;
      showProfileCard();
      playBtn.disabled = false;
      playBtn.textContent = '▶ 播放演示';
    }

    playBtn.onclick = function () { play(); };
    replayBtn.onclick = function () {
      App.ui.toast('已清空对话，重新播放演示');
      play();
    };

    /* ---------- 右栏：FAQ 知识库卡 ---------- */
    function renderFaqCard() {
      var faq = App.data.faq;
      var card = el.querySelector('#q-faq-card');
      var shown = faq.slice(0, 8);

      card.innerHTML =
        '<div class="card-title">' +
        '<span>FAQ 知识库 <span class="sub">AI 回答弹药 · 共 ' + faq.length + ' 条</span></span>' +
        '<button class="btn btn-sm" id="q-faq-add">新增 FAQ</button>' +
        '</div>' +
        App.ui.table([
          { key: 'q', label: '问题', render: function (r) { return '<span class="small">' + App.esc(r.q) + '</span>'; } },
          {
            key: 'tags', label: '标签', width: '86px', render: function (r) {
              return (r.tags || []).map(function (t) { return App.ui.chip(t); }).join('');
            }
          }
        ], shown, {
          rowAttr: function (r, idx) { return 'class="clickable" data-fi="' + idx + '"'; }
        }) +
        '<div class="small muted mt8">仅展示前 8 条 · 知识库共 ' + faq.length + ' 条，点击任意行可查看/编辑答案</div>';

      card.querySelector('#q-faq-add').onclick = openFaqAddModal;
      card.querySelectorAll('tr[data-fi]').forEach(function (tr) {
        tr.onclick = function () {
          openFaqEditModal(parseInt(tr.getAttribute('data-fi'), 10));
        };
      });
    }

    function openFaqEditModal(idx) {
      var item = App.data.faq[idx];
      if (!item) return;
      App.ui.modal('查看 / 编辑 FAQ',
        '<div class="field"><span class="field-label">问题</span>' +
        '<div style="font-size:13.5px;line-height:1.7;font-weight:600">' + App.esc(item.q) + '</div></div>' +
        '<div class="field"><span class="field-label">标签</span>' +
        (item.tags || []).map(function (t) { return App.ui.chip(t); }).join('') + '</div>' +
        '<div class="field mb0"><span class="field-label">答案（可编辑，AI 将按此口径回复）</span>' +
        '<textarea class="textarea" id="q-faq-a" style="min-height:120px">' + App.esc(item.a) + '</textarea></div>',
        '<button class="btn" id="q-faq-cancel">取消</button>' +
        '<button class="btn btn-primary" id="q-faq-save">保存修改</button>'
      );
      document.getElementById('q-faq-cancel').onclick = App.ui.closeModal;
      document.getElementById('q-faq-save').onclick = function () {
        var val = document.getElementById('q-faq-a').value.trim();
        if (!val) { App.ui.toast('答案不能为空', 'bad'); return; }
        App.data.faq[idx].a = val;
        App.ui.closeModal();
        App.ui.toast('答案已更新（演示环境仅保存在内存）', 'ok');
        renderFaqCard();
      };
    }

    function openFaqAddModal() {
      App.ui.modal('新增 FAQ',
        '<div class="field"><span class="field-label">问题（客户可能怎么问，中英文均可）</span>' +
        '<input class="input" id="q-new-q" placeholder="例：Do you ship to UK? / 发英国吗？"></div>' +
        '<div class="field mb0"><span class="field-label">标准答案（AI 将按此口径回复）</span>' +
        '<textarea class="textarea" id="q-new-a" placeholder="填写希望 AI 使用的标准话术…"></textarea></div>',
        '<button class="btn" id="q-new-cancel">取消</button>' +
        '<button class="btn btn-primary" id="q-new-save">保存并生效</button>'
      );
      document.getElementById('q-new-cancel').onclick = App.ui.closeModal;
      document.getElementById('q-new-save').onclick = function () {
        var q = document.getElementById('q-new-q').value.trim();
        var a = document.getElementById('q-new-a').value.trim();
        if (!q || !a) { App.ui.toast('问题和答案都要填写', 'bad'); return; }
        App.data.faq.push({ q: q, a: a, tags: ['新增'] });
        App.ui.closeModal();
        App.ui.toast('FAQ 已新增，AI 即刻可用（演示环境仅保存在内存）', 'ok');
        renderFaqCard();
      };
    }

    renderFaqCard();

    /* ---------- 右栏：画像字段勾选 ---------- */
    el.querySelectorAll('input[data-qf]').forEach(function (cb) {
      cb.onchange = function () { App.ui.toast('采集字段已更新'); };
    });
  }

  App.registerModule({
    id: 'qualify',
    nav: { section: '销转端', label: '初筛客服 AI', icon: '🤖' },
    render: render
  });
})();
