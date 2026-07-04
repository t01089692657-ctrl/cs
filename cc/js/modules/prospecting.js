/* ============ 模块：主动客户开发（流量端） ============
 * 按 ICP 从谷歌/领英/海关数据批量找潜客 → AI 打分判定 →
 * 邮件+WhatsApp 序列触达 → 客户一回复即成线索。
 * 约定：IIFE 包裹、数据读 App.data、私有样式以 .mod-prospecting 开头、
 *       事件绑定在 innerHTML 之后、动态数据一律 App.esc() 转义。
 */
(function () {
  'use strict';

  /* ---------- 模块私有状态（仅内存，刷新即还原） ---------- */
  var state = { tab: 'icp' };
  var converted = {};   // prospectId -> true：该回复已转入线索池
  var leadSeq = 100;    // 生成线索 id 的自增序号

  var TABS = [
    { id: 'icp', label: '目标画像 ICP' },
    { id: 'discover', label: '潜客发现' },
    { id: 'sequence', label: '触达序列' },
    { id: 'inbox', label: '回复收件箱' }
  ];

  /* ---------- 小工具 ---------- */
  function findProspect(id) {
    var list = App.data.prospects;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function totalWeight() {
    return App.data.icp.scoringRules.reduce(function (s, r) {
      return s + (Number(r.weight) || 0);
    }, 0);
  }

  function weightSumHtml() {
    var sum = totalWeight();
    return String(sum) + (sum === 100 ? '' : ' <span class="small text-warn">（建议合计 100）</span>');
  }

  function scoreCls(score) {
    return score >= 75 ? 'ok' : score >= 50 ? 'warn' : 'bad';
  }

  function statusBadge(st) {
    var type = st === '已回复→线索' ? 'ok'
      : st === '已排除' ? 'gray'
        : (st === '已发邮件' || st === '已发WA') ? 'accent'
          : 'warn'; // 待触达
    return App.ui.badge(st, type);
  }

  // 占位符高亮：先转义，再把 {name} {company} {country} 包成紫色徽章
  function hl(text) {
    return App.esc(text).replace(/\{(name|company|country)\}/g, function (m) {
      return '<span class="badge badge-purple">' + m + '</span>';
    });
  }

  function nameOf(reply) {
    return String(reply.from || '').split('·')[0].trim();
  }

  /* ---------- AI 判定理由（按分数区间生成中文分析） ---------- */
  function judgeReason(p) {
    var icp = App.data.icp;
    var inCountry = icp.countries.indexOf(p.country) >= 0;
    var sig = (p.signals || []).join('、') || '暂无显著信号';
    if (p.score >= 75) {
      return '综合评分 ' + p.score + ' 分，判定：高度匹配。\n' +
        '① 市场匹配：' + p.country + (inCountry ? ' 在目标市场清单内，物流与合规路径成熟；' : ' 虽不在核心清单内，但其余信号足够强；') + '\n' +
        '② 角色匹配：联系人 ' + p.person + '（' + p.role + '）属于决策角色，可直达拍板人，沟通链路短；\n' +
        '③ 关键信号：' + sig + '。\n' +
        '结论：画像与已成交客户高度相似。建议立即进入 D0 邮件序列，D7 叠加 WhatsApp 双通道触达，列为本周优先跟进对象。';
    }
    if (p.score >= 50) {
      return '综合评分 ' + p.score + ' 分，判定：中度匹配。\n' +
        '① 市场匹配：' + p.country + (inCountry ? ' 在目标市场清单内；' : ' 不在核心目标市场清单，该项权重被扣分；') + '\n' +
        '② 命中信号：' + sig + '，但决策链或采购规模信息尚不完整，确定性一般；\n' +
        '结论：需求可能真实但需验证。建议先走邮件序列，观察打开/点击行为，出现互动信号后再升级为 WhatsApp 人工触达，避免过早投入销售时间。';
    }
    return '综合评分 ' + p.score + ' 分，判定：匹配度低。\n' +
      '① 行业信号：' + sig + '，与四类目标客户画像偏离较大；\n' +
      '② 市场因素：' + p.country + (inCountry ? ' 虽在目标市场，但业务相关性不足；' : ' 不在目标市场清单内；') + '\n' +
      '结论：成单概率低，不建议投入销售时间。可保留在名单中仅做低频邮件触达，或直接排除出本轮开发计划。';
  }

  /* ---------- AI 回复意向判定（演示预设） ---------- */
  function judgeReply(idx) {
    if (idx === 0) {
      return { level: 'A', reason: '判定理由：明确提出 2027 春季新增 6 套的扩建计划，有清晰数量与时间线，并主动索要案例与报价。' };
    }
    if (idx === 1) {
      return { level: 'B', reason: '判定理由：存在真实采购渠道（现从爱沙尼亚进口），主动索要保温规格，处于供应商比较阶段。' };
    }
    return { level: 'B', reason: '判定理由：主动回复触达序列并提出具体问题，需求待进一步确认。' };
  }

  /* ============ 渲染入口 ============ */
  function render(el) {
    el.innerHTML =
      '<style>' +
      '.mod-prospecting .w-input{width:84px;padding:4px 8px}' +
      '.mod-prospecting .score-cell{display:flex;align-items:center;gap:8px;min-width:110px}' +
      '.mod-prospecting .score-cell .progress{flex:1}' +
      '.mod-prospecting .score-cell b{width:26px;text-align:right;font-size:12px}' +
      '.mod-prospecting .reply-quote{background:#f8fafc;border-left:3px solid var(--accent);padding:10px 12px;border-radius:6px;margin-top:12px;font-size:13px;line-height:1.7}' +
      '.mod-prospecting .seq-body{white-space:pre-wrap;line-height:1.8;color:var(--ink)}' +
      '.mod-prospecting .judge-box{white-space:pre-wrap;line-height:1.8;font-size:13px}' +
      '</style>' +
      '<div class="mod-prospecting">' +
      '<div class="tabs" id="pros-tabs">' +
      TABS.map(function (t) {
        return '<div class="tab' + (state.tab === t.id ? ' active' : '') + '" data-tab="' + t.id + '">' + App.esc(t.label) + '</div>';
      }).join('') +
      '</div>' +
      '<div id="pros-body"></div>' +
      '</div>';

    // Tab 切换：直接重画 body 容器
    el.querySelectorAll('#pros-tabs .tab').forEach(function (tabEl) {
      tabEl.onclick = function () {
        state.tab = tabEl.getAttribute('data-tab');
        el.querySelectorAll('#pros-tabs .tab').forEach(function (x) {
          x.classList.toggle('active', x.getAttribute('data-tab') === state.tab);
        });
        renderBody(el.querySelector('#pros-body'));
      };
    });

    renderBody(el.querySelector('#pros-body'));
  }

  function renderBody(body) {
    if (state.tab === 'icp') renderIcp(body);
    else if (state.tab === 'discover') renderDiscover(body);
    else if (state.tab === 'sequence') renderSequence(body);
    else renderInbox(body);
  }

  /* ============ Tab 1：目标画像 ICP ============ */
  function renderIcp(body) {
    var icp = App.data.icp;

    var rulesRows = icp.scoringRules.map(function (r, i) {
      return '<tr><td>' + App.esc(r.rule) + '</td>' +
        '<td><input type="number" class="input w-input" data-wi="' + i + '" value="' + (Number(r.weight) || 0) + '" min="0" max="100"></td></tr>';
    }).join('');

    body.innerHTML =
      '<div class="grid grid-2">' +

      // ① 目标市场与角色
      '<div class="card mb0"><div class="card-title"><span>目标市场与角色 <span class="sub">谁是我们的理想客户</span></span></div>' +
      '<div class="field-label">目标国家/地区</div><div class="mb12">' +
      icp.countries.map(function (c) { return App.ui.chip(c); }).join('') + '</div>' +
      '<div class="field-label">决策角色</div><div class="mb12">' +
      icp.roles.map(function (r) { return App.ui.chip(r); }).join('') + '</div>' +
      '<div class="field-label">公司类型</div><div>' +
      icp.companyTypes.map(function (t) { return App.ui.chip(t); }).join('') + '</div>' +
      '</div>' +

      // ② 搜索关键词
      '<div class="card mb0"><div class="card-title"><span>搜索关键词 <span class="sub">用于 Google / LinkedIn / 海关数据检索</span></span></div>' +
      '<div id="icp-kws">' +
      icp.keywords.map(function (k) { return App.ui.chip(k, true); }).join('') +
      '</div>' +
      '<div class="row mt12">' +
      '<input class="input" id="icp-kw-input" placeholder="输入新关键词，如 eco resort cabins">' +
      '<button class="btn btn-primary" id="icp-kw-add">添加关键词</button>' +
      '</div>' +
      '<div class="small muted mt8">点击关键词右侧 × 可移除；改动仅在本次演示内存中生效。</div>' +
      '</div>' +
      '</div>' +

      // ③ AI 打分规则
      '<div class="card mt16"><div class="card-title"><span>AI 打分规则 <span class="sub">权重可直接修改，AI 按合计权重归一化打分</span></span></div>' +
      '<table class="tbl"><thead><tr><th>评分规则</th><th style="width:130px">权重</th></tr></thead>' +
      '<tbody>' + rulesRows + '</tbody>' +
      '<tfoot><tr><td class="bold">合计权重</td><td class="bold" id="icp-wsum">' + weightSumHtml() + '</td></tr></tfoot>' +
      '</table></div>';

    // 事件：添加关键词
    function addKeyword() {
      var inp = body.querySelector('#icp-kw-input');
      var v = (inp.value || '').trim();
      if (!v) { App.ui.toast('请先输入关键词'); return; }
      if (App.data.icp.keywords.indexOf(v) >= 0) { App.ui.toast('该关键词已存在'); return; }
      App.data.icp.keywords.push(v);
      App.ui.toast('关键词已添加，下轮抓取生效');
      renderIcp(body);
    }
    body.querySelector('#icp-kw-add').onclick = addKeyword;
    body.querySelector('#icp-kw-input').onkeydown = function (e) {
      if (e.key === 'Enter') addKeyword();
    };

    // 事件：移除关键词
    body.querySelectorAll('#icp-kws .x').forEach(function (x) {
      x.onclick = function () {
        var k = x.getAttribute('data-chip');
        var arr = App.data.icp.keywords;
        var idx = arr.indexOf(k);
        if (idx >= 0) arr.splice(idx, 1);
        App.ui.toast('关键词已移除，下轮抓取生效');
        renderIcp(body);
      };
    });

    // 事件：权重编辑
    body.querySelectorAll('input[data-wi]').forEach(function (inp) {
      inp.onchange = function () {
        var i = parseInt(inp.getAttribute('data-wi'), 10);
        var v = parseInt(inp.value, 10);
        if (isNaN(v) || v < 0) { v = 0; }
        if (v > 100) { v = 100; }
        inp.value = String(v);
        App.data.icp.scoringRules[i].weight = v;
        var sumEl = body.querySelector('#icp-wsum');
        if (sumEl) sumEl.innerHTML = weightSumHtml();
        App.ui.toast('权重已更新，下轮评分生效');
      };
    });
  }

  /* ============ Tab 2：潜客发现 ============ */
  function renderDiscover(body) {
    var list = App.data.prospects;
    var pending = list.filter(function (p) { return p.status === '待触达'; }).length;
    var replied = list.filter(function (p) { return p.status === '已回复→线索'; }).length;

    var cols = [
      {
        key: 'company', label: '公司', render: function (r) {
          return '<b>' + App.esc(r.company) + '</b><div class="small muted">' + App.esc(r.website) + '</div>';
        }
      },
      { key: 'country', label: '国家' },
      {
        key: 'person', label: '联系人', render: function (r) {
          return App.esc(r.person) + ' ' + App.ui.badge(r.role, 'info');
        }
      },
      {
        key: 'signals', label: '信号', render: function (r) {
          var s = r.signals || [];
          var h = s.slice(0, 2).map(function (x) { return App.ui.chip(x); }).join('');
          if (s.length > 2) h += '<span class="chip chip-accent">+' + (s.length - 2) + '</span>';
          return h;
        }
      },
      {
        key: 'score', label: 'AI 评分', width: '140px', render: function (r) {
          return '<div class="score-cell">' + App.ui.progress(r.score, scoreCls(r.score)) +
            '<b>' + r.score + '</b></div>';
        }
      },
      {
        key: 'status', label: '状态', render: function (r) {
          return statusBadge(r.status) +
            (r.lastAction && r.lastAction !== '-' ? '<div class="small muted mt8">' + App.esc(r.lastAction) + '</div>' : '');
        }
      }
    ];

    body.innerHTML =
      '<div class="card">' +
      '<div class="card-title"><span>潜客名单 <span class="sub">共 ' + list.length + ' 家 · 待触达 ' + pending + ' · 已转线索 ' + replied + '</span></span>' +
      '<button class="btn btn-primary btn-sm" id="pros-fetch">🌍 AI 抓取新一批潜客</button></div>' +
      '<div id="pros-fetch-think"></div>' +
      App.ui.table(cols, list, {
        emptyMsg: '暂无潜客，点击右上角开始抓取',
        rowAttr: function (r) { return 'class="clickable" data-pid="' + App.esc(r.id) + '"'; }
      }) +
      '<div class="small muted mt8">点击任意一行查看公司全量信息与 AI 判定理由。</div>' +
      '</div>';

    // 事件：AI 抓取
    var fetchBtn = body.querySelector('#pros-fetch');
    fetchBtn.onclick = function () {
      if (fetchBtn.disabled) return;
      fetchBtn.disabled = true;
      var box = body.querySelector('#pros-fetch-think');
      var stop = App.ai.thinking(box, '正在按 ICP 关键词扫描 Google / LinkedIn / 海关数据源…');
      App.ai.delay(2000).then(function () {
        stop();
        fetchBtn.disabled = false;
        App.ui.toast('演示环境：正式版对接 Google/LinkedIn/海关数据源抓取');
      });
    };

    // 事件：行点击 → 详情弹窗
    body.querySelectorAll('tr[data-pid]').forEach(function (tr) {
      tr.onclick = function () {
        var p = findProspect(tr.getAttribute('data-pid'));
        if (p) openProspectModal(p);
      };
    });
  }

  function openProspectModal(p) {
    var kv =
      '<dl class="kv">' +
      '<dt>公司</dt><dd><b>' + App.esc(p.company) + '</b></dd>' +
      '<dt>官网</dt><dd>' + App.esc(p.website) + '</dd>' +
      '<dt>国家</dt><dd>' + App.esc(p.country) + '</dd>' +
      '<dt>联系人</dt><dd>' + App.esc(p.person) + ' ' + App.ui.badge(p.role, 'info') + '</dd>' +
      '<dt>AI 评分</dt><dd><b>' + p.score + '</b> / 100</dd>' +
      '<dt>状态</dt><dd>' + statusBadge(p.status) + '</dd>' +
      '<dt>最近动作</dt><dd>' + App.esc(p.lastAction || '-') + '</dd>' +
      '</dl>';

    var bodyH =
      kv +
      '<div class="mt12"><div class="field-label">全部信号</div>' +
      (p.signals || []).map(function (s) { return App.ui.chip(s); }).join('') +
      '</div>' +
      '<div class="ai-box mt12">' +
      '<div class="row mb8" style="gap:8px"><span class="ai-tag">AI</span><span class="small bold">评分判定理由</span></div>' +
      '<div class="judge-box" id="pros-judge"></div>' +
      '</div>';

    var footH = '<button class="btn" id="pros-modal-cancel">关闭</button>' +
      (p.status === '待触达'
        ? '<button class="btn btn-primary" id="pros-add-seq">加入触达序列</button>'
        : '');

    App.ui.modal(p.company + ' · 潜客详情', '<div class="mod-prospecting">' + bodyH + '</div>', footH);

    document.getElementById('pros-modal-cancel').onclick = App.ui.closeModal;

    var addBtn = document.getElementById('pros-add-seq');
    if (addBtn) {
      addBtn.onclick = function () {
        p.status = '已发邮件';
        p.lastAction = 'D0 邮件已发送（刚刚）';
        App.ui.closeModal();
        App.ui.toast('已进入 D0 邮件序列');
        var bodyEl = document.getElementById('pros-body');
        if (bodyEl && state.tab === 'discover') renderDiscover(bodyEl);
      };
    }

    // AI 判定理由：思考动画 + 打字机输出
    var judgeEl = document.getElementById('pros-judge');
    var stop = App.ai.thinking(judgeEl, '正在逐条比对 ICP 打分规则…');
    App.ai.delay(1400).then(function () {
      stop();
      if (!document.body.contains(judgeEl)) return; // 弹窗已被关闭
      App.ai.typeInto(judgeEl, judgeReason(p), 90);
    });
  }

  /* ============ Tab 3：触达序列 ============ */
  function renderSequence(body) {
    var seqs = App.data.outreachSequences;

    body.innerHTML =
      '<div class="card">' +
      '<div class="card-title"><span>自动触达序列 <span class="sub">潜客在任一步骤回复，后续触达自动停止并转入回复收件箱</span></span></div>' +
      '<div class="timeline">' +
      seqs.map(function (s, i) {
        var chBadge = App.ui.badge(s.channel, s.channel === '邮件' ? 'accent' : 'ok');
        var subjH = (s.subject && s.subject !== '-')
          ? '<div class="bold mb8">' + hl(s.subject) + '</div>'
          : '';
        return '<div class="tl-item">' +
          '<div class="tl-time"><b>' + App.esc(s.day) + '</b> &nbsp;' + chBadge + '</div>' +
          '<div class="tl-body">' + subjH +
          '<div class="seq-body small">' + hl(s.body) + '</div>' +
          '<div class="mt8"><button class="btn btn-sm" data-edit="' + i + '">编辑</button></div>' +
          '</div></div>';
      }).join('') +
      '</div>' +
      '<div class="notice mt8">📮 发信域名预热、发送频控、退订合规由系统自动管理（正式版对接邮件服务商）；WhatsApp 触达采用保守频控策略，防止账号封禁。</div>' +
      '</div>';

    body.querySelectorAll('button[data-edit]').forEach(function (btn) {
      btn.onclick = function () {
        openSeqEditModal(parseInt(btn.getAttribute('data-edit'), 10), body);
      };
    });
  }

  function openSeqEditModal(i, listBody) {
    var s = App.data.outreachSequences[i];
    var isMail = s.channel === '邮件';

    var bodyH =
      '<div class="notice">可使用占位符 <span class="badge badge-purple">{name}</span> <span class="badge badge-purple">{company}</span> <span class="badge badge-purple">{country}</span>，发送时自动替换为潜客真实信息。</div>' +
      (isMail
        ? '<div class="field"><label class="field-label">邮件主题</label>' +
        '<input class="input" id="seq-edit-subj" value="' + App.esc(s.subject) + '"></div>'
        : '') +
      '<div class="field"><label class="field-label">' + (isMail ? '邮件正文' : 'WhatsApp 消息内容') + '</label>' +
      '<textarea class="textarea" id="seq-edit-body" rows="8">' + App.esc(s.body) + '</textarea></div>';

    var footH = '<button class="btn" id="seq-edit-cancel">取消</button>' +
      '<button class="btn btn-primary" id="seq-edit-save">保存</button>';

    App.ui.modal('编辑触达话术 · ' + s.day + ' ' + s.channel, bodyH, footH);

    document.getElementById('seq-edit-cancel').onclick = App.ui.closeModal;
    document.getElementById('seq-edit-save').onclick = function () {
      var bodyVal = (document.getElementById('seq-edit-body').value || '').trim();
      if (!bodyVal) { App.ui.toast('正文不能为空'); return; }
      if (isMail) {
        var subjVal = (document.getElementById('seq-edit-subj').value || '').trim();
        if (!subjVal) { App.ui.toast('邮件主题不能为空'); return; }
        s.subject = subjVal;
      }
      s.body = bodyVal;
      App.ui.closeModal();
      App.ui.toast('话术已保存（演示：仅本次内存生效）');
      if (state.tab === 'sequence') renderSequence(listBody);
    };
  }

  /* ============ Tab 4：回复收件箱 ============ */
  function renderInbox(body) {
    var replies = App.data.inboxReplies;
    var allDone = replies.length > 0 && replies.every(function (r) { return converted[r.prospectId]; });

    if (!replies.length || allDone) {
      body.innerHTML = '<div class="card">' +
        App.ui.empty('回复已全部转入线索池，新回复到达后会自动出现在这里', '📬') +
        '</div>';
      return;
    }

    body.innerHTML =
      '<div class="notice">潜客在任一触达步骤回复后进入此收件箱，AI 自动判定意向等级；点击「转为线索」后，销转端「线索池」立即可见。</div>' +
      replies.map(function (r, i) {
        var j = judgeReply(i);
        var done = !!converted[r.prospectId];
        return '<div class="card">' +
          '<div class="row-between">' +
          '<div class="row" style="gap:10px">' + App.ui.avatar(nameOf(r)) +
          '<div><div class="bold">' + App.esc(r.from) + '</div>' +
          '<div class="small muted">' + App.esc(r.time) + ' · 回复了触达序列</div></div></div>' +
          '<button class="btn ' + (done ? '' : 'btn-primary') + '" data-conv="' + i + '"' + (done ? ' disabled' : '') + '>' +
          (done ? '已转入' : '转为线索') + '</button>' +
          '</div>' +
          '<div class="reply-quote">' + App.esc(r.text) + '</div>' +
          '<div class="row mt8" style="gap:8px;flex-wrap:wrap">' +
          '<span class="ai-tag">AI</span>' + App.ui.intentBadge(j.level) +
          '<span class="small muted">' + App.esc(j.reason) + '</span>' +
          '</div>' +
          '</div>';
      }).join('');

    body.querySelectorAll('button[data-conv]').forEach(function (btn) {
      btn.onclick = function () {
        var i = parseInt(btn.getAttribute('data-conv'), 10);
        var r = replies[i];
        if (!r || converted[r.prospectId]) return;

        var p = findProspect(r.prospectId);
        var summary = r.text.length > 60 ? r.text.slice(0, 60) + '…' : r.text;
        leadSeq++;
        App.data.leadsPool.unshift({
          id: 'lp' + leadSeq + '-' + Date.now(),
          name: p ? p.person : nameOf(r),
          country: p ? p.country : '—',
          source: '主动开发',
          time: '刚刚',
          msg: summary,
          status: '未分配',
          owner: null
        });
        converted[r.prospectId] = true;
        if (p) {
          p.status = '已回复→线索';
          p.lastAction = '回复已转入线索池';
        }

        btn.textContent = '已转入';
        btn.disabled = true;
        btn.classList.remove('btn-primary');
        App.ui.toast('已进入线索池，销转端可见');

        var allNow = replies.every(function (x) { return converted[x.prospectId]; });
        if (allNow && state.tab === 'inbox') renderInbox(body);
      };
    });
  }

  /* ---------- 注册模块 ---------- */
  App.registerModule({
    id: 'prospecting',
    nav: { section: '流量端', label: '主动客户开发', icon: '🌍' },
    render: render
  });
})();
