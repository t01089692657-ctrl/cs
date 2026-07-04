/* ============ 模块：存量客户分析 ============
 * AI 通读全部 WhatsApp 历史会话，逐个提取画像打标签，给 CRM 冷启动。
 * 三个状态：初始态 → 扫描态 → 报告态（模块内部变量 viewState 控制）。
 */
(function () {
  'use strict';

  // 模块私有状态
  var viewState = 'initial';   // 'initial' | 'scanning' | 'report'
  var tagsApplied = false;     // 一键应用标签是否已执行（同一会话内保持）
  var scanTimer = null;        // 扫描态的 setInterval 句柄

  var MOCK_AVG_IDLE_DAYS = 11; // 平均未跟进天数（演示 mock 值）

  /* ---------- 工具 ---------- */

  function pad4(n) {
    var s = String(n);
    while (s.length < 4) s = '0' + s;
    return s;
  }

  function countBy(list, keyFn) {
    var map = {};
    list.forEach(function (item) {
      var k = keyFn(item);
      if (!k) return;
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }

  function findingOf(c) {
    return (App.data.analysisFindings || {})[c.id] || null;
  }

  // 无 findings 的客户 → 通用兜底内容
  function rowDataOf(c) {
    var f = findingOf(c);
    if (f) {
      return { focus: f.focus, stageJudge: f.stageJudge, risk: f.risk, action: f.action, autoTags: f.autoTags };
    }
    return {
      focus: ['基础信息'],
      stageJudge: (c.stage || '新询盘') + '（沿用 CRM 阶段）',
      risk: '样本消息不足',
      action: '补充沟通后重新分析',
      autoTags: []
    };
  }

  /* ---------- 扫描日志生成（用真实客户数据） ---------- */

  function buildScanLogs() {
    var lines = [];
    var customers = App.data.customers;
    var vStart = 101; // 虚拟会话编号起点
    lines.push('连接 WhatsApp 会话存档… 共发现 1,000 个历史会话（演示读取 14 个真实样本）');
    customers.forEach(function (c, i) {
      var chat = (App.data.chats || {})[c.id];
      var msgCount = chat ? chat.length : (3 + (i % 4));
      lines.push('正在读取 ' + c.name + '（' + c.company + '）会话 · ' + msgCount + ' 条消息');

      var noteBit = String(c.note || '').split(/[，,。]/)[0];
      if (noteBit.length > 18) noteBit = noteBit.slice(0, 18) + '…';
      var profile = c.country + '/' + c.type + (noteBit ? '/' + noteBit : '');
      lines.push('提取画像：' + profile);

      var f = findingOf(c);
      var tags = f ? f.autoTags : (c.tags && c.tags.length ? c.tags : ['基础信息']);
      lines.push('自动标签：' + tags.join('、'));

      // 每 3 个真实客户后穿插一段虚拟会话批量扫描
      if (i % 3 === 2 && i < customers.length - 1) {
        var a = vStart, b = vStart + 60 + (i * 2);
        lines.push('…批量扫描虚拟会话 #' + pad4(a) + '-#' + pad4(b) + '（演示跳过）');
        vStart = b + 1;
      }
    });
    lines.push('…批量扫描虚拟会话 #' + pad4(vStart) + '-#' + pad4(1000) + '（演示跳过）');
    lines.push('扫描完成：14 个真实样本 + 986 个虚拟会话，正在生成分析报告…');
    return lines;
  }

  /* ---------- 唤醒话术（结合 findings.action 与客户背景） ---------- */

  function wakeMessageOf(c) {
    if (c.id === 'c13') {
      return 'Hi Fatima, hope things are going well at Atlas Camps! Quick update: we just delivered a 12-unit desert camp in Saudi Arabia using the same sand-sealing + heat-insulation spec we prepared for your Sahara site, and I can share the install photos plus 45°C performance data. One heads-up: our Q3 production slots are filling fast, so if the investors are ready to revisit the 8-unit plan, I can still hold the original quoted price and an early slot for you this week.' +
        '\n\n【中文对照】\nFatima 您好！近况如何？同步一个新进展：我们刚在沙特交付了一个 12 套的沙漠营地，用的正是当时为您撒哈拉项目准备的防沙密封+隔热方案，可以发安装实拍和 45℃ 高温实测数据给您。另外提醒：Q3 排产位正在快速占满，如果投资人准备重启 8 套的计划，本周内我还能为您保留原报价和优先排产位。';
    }
    if (c.id === 'c14') {
      return 'Hi David, good news since we last spoke: the Busan-Jeju ferry logistics route is now fully worked out, so the door-to-site cost for Jeju is clearer and lower than first estimated. If the Jeju trial is still on your roadmap, the 2-unit trial-dealer package ($9,500/unit with Korean-standard electrical) is still open — want me to send the updated landed-cost sheet?' +
        '\n\n【中文对照】\nDavid 您好！上次聊过之后有个好消息：釜山—济州的渡轮物流方案已经全部打通，济州到场成本比当初估算的更清晰也更低。如果济州试销还在您的计划里，2 套试销经销价（$9,500/套、含韩标电气）依然有效——要不要我把更新后的到岸成本表发给您？';
    }
    // 兜底：按 findings.action + 客户背景生成通用唤醒消息
    var d = rowDataOf(c);
    var firstName = String(c.name || 'there').split(' ')[0];
    return 'Hi ' + firstName + ', it has been a while since we last talked about your project. We have new delivery cases in your region and updated pricing for this season — happy to share if the plan is still on your list. When would be a good time to reconnect?' +
      '\n\n【中文对照】\n' + firstName + ' 您好！距离上次沟通有段时间了。我们在您所在市场有了新的交付案例和本季更新报价，如果项目还在计划中，很乐意同步给您。AI 建议动作：' + d.action + '。';
  }

  /* ---------- 主渲染入口 ---------- */

  function render(el) {
    if (viewState === 'scanning') renderScanning(el);
    else if (viewState === 'report') renderReport(el);
    else renderInitial(el);
  }

  function styleBlock() {
    return '<style>' +
      '.mod-analysis .scan-log{background:#0f172a;color:#94a3b8;font-family:Consolas,Menlo,monospace;font-size:12px;line-height:1.8;border-radius:8px;padding:12px 14px;height:260px;overflow-y:auto;margin-top:14px}' +
      '.mod-analysis .scan-log .ln-ok{color:#4ade80}' +
      '.mod-analysis .scan-log .ln-tag{color:#93c5fd}' +
      '.mod-analysis .scan-log .ln-skip{color:#475569}' +
      '.mod-analysis .pain-box{background:var(--warn-soft);border:1px solid #fde4bd;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.8;color:#92400e;margin-bottom:16px}' +
      '.mod-analysis .wake-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f3f7}' +
      '.mod-analysis .wake-row:last-child{border-bottom:none}' +
      '.mod-analysis .wake-out{white-space:pre-wrap;font-size:13px;line-height:1.7;background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:12px;min-height:80px;margin-top:10px}' +
      '</style>';
  }

  /* ---------- 1. 初始态 ---------- */

  function renderInitial(el) {
    var stepDefs = ['读取会话', '提取画像', '自动打标', '生成报告', '回填 CRM'];
    var stepsHtml = stepDefs.map(function (s, i) {
      return '<div class="step active"><div class="step-dot">' + (i + 1) + '</div>' + App.esc(s) + '</div>' +
        (i < stepDefs.length - 1 ? '<div class="step-line"></div>' : '');
    }).join('');

    el.innerHTML =
      styleBlock() +
      '<div class="mod-analysis">' +
      '<div class="card">' +
      '<div class="card-title">存量客户批量分析 <span class="sub">AI 通读历史会话 · 给 CRM 冷启动</span></div>' +

      '<div class="pain-box"><b>你是不是也有这个痛点：</b>做了几年外贸，上千个历史客户躺在业务员的 WhatsApp 聊天记录里，' +
      '没人有精力一个个翻。换系统、上 CRM 的时候，客户库是空的——最值钱的资产反而没进系统。</div>' +

      '<div class="mb12" style="font-size:13.5px;line-height:1.8">本模块让 AI 替你通读全部历史会话：逐个客户提取画像（国家/类型/需求/预算）、' +
      '自动打标签、判断所处阶段与风险，最后一键把结论回填 CRM，并把值得唤醒的沉睡客户单独拎出来。</div>' +

      '<div class="steps mt16">' + stepsHtml + '</div>' +

      '<button class="btn btn-primary" id="ana-start" style="padding:10px 22px;font-size:14px">开始扫描历史会话（演示：14 个真实样本，模拟 1,000 会话）</button>' +
      '<div class="small muted mt8">正式版将对接 WhatsApp Business API 读取全量会话存档，演示环境只分析样本数据。</div>' +
      '</div>' +
      '</div>';

    el.querySelector('#ana-start').onclick = function () {
      viewState = 'scanning';
      render(el);
    };
  }

  /* ---------- 2. 扫描态 ---------- */

  function renderScanning(el) {
    el.innerHTML =
      styleBlock() +
      '<div class="mod-analysis">' +
      '<div class="card">' +
      '<div class="card-title">正在扫描历史会话… <span class="sub" id="ana-pct">0%</span></div>' +
      '<div id="ana-progress">' + App.ui.progress(0) + '</div>' +
      '<div class="scan-log" id="ana-log"></div>' +
      '</div>' +
      '</div>';

    var logEl = el.querySelector('#ana-log');
    var barEl = el.querySelector('#ana-progress .progress-bar');
    var pctEl = el.querySelector('#ana-pct');
    var lines = buildScanLogs();
    var idx = 0;
    var interval = Math.round(6000 / lines.length); // 总时长约 6 秒

    if (scanTimer) clearInterval(scanTimer);
    scanTimer = setInterval(function () {
      // 用户中途切走：停止扫描并复位，避免操作已卸载的 DOM
      if (!document.body.contains(logEl)) {
        clearInterval(scanTimer);
        scanTimer = null;
        viewState = 'initial';
        return;
      }
      var line = lines[idx];
      var div = document.createElement('div');
      if (line.indexOf('自动标签') === 0) div.className = 'ln-tag';
      else if (line.indexOf('…批量扫描') === 0) div.className = 'ln-skip';
      else if (line.indexOf('扫描完成') === 0) div.className = 'ln-ok';
      div.textContent = line;
      logEl.appendChild(div);
      logEl.scrollTop = logEl.scrollHeight;

      idx++;
      var pct = Math.min(100, Math.round(idx / lines.length * 100));
      barEl.style.width = pct + '%';
      pctEl.textContent = pct + '%';

      if (idx >= lines.length) {
        clearInterval(scanTimer);
        scanTimer = null;
        setTimeout(function () {
          if (!document.body.contains(logEl)) { viewState = 'initial'; return; }
          viewState = 'report';
          render(el);
          App.ui.toast('扫描完成，已生成存量客户分析报告', 'ok');
        }, 700);
      }
    }, interval);
  }

  /* ---------- 3. 报告态 ---------- */

  function renderReport(el) {
    var customers = App.data.customers;
    var findings = App.data.analysisFindings || {};

    var aCount = customers.filter(function (c) { return c.intent === 'A'; }).length;
    var sleeping = customers.filter(function (c) { return (c.tags || []).indexOf('待唤醒') >= 0; });

    // 图表数据
    var intentMap = countBy(customers, function (c) { return c.intent; });
    var intentBars = ['A', 'B', 'C', 'D'].map(function (lv) {
      return { label: lv + ' 类', v: intentMap[lv] || 0 };
    });
    var typeMap = countBy(customers, function (c) { return c.type; });
    var typeBars = Object.keys(typeMap).map(function (t) { return { label: t, v: typeMap[t] }; })
      .sort(function (x, y) { return y.v - x.v; });
    var countryMap = countBy(customers, function (c) { return c.country; });
    var countryBars = Object.keys(countryMap).map(function (t) { return { label: t, v: countryMap[t] }; })
      .sort(function (x, y) { return y.v - x.v; }).slice(0, 5);

    // 明细表
    var tableHtml = App.ui.table([
      { key: 'name', label: '客户', width: '170px', render: function (c) {
          return '<div class="row" style="gap:8px">' + App.ui.avatar(c.name, true) +
            '<div><b>' + App.esc(c.name) + '</b><div class="small muted">' + App.esc(c.company) + '</div></div></div>';
        } },
      { key: 'focus', label: '关注点', render: function (c) {
          return rowDataOf(c).focus.map(function (t) { return App.ui.chip(t); }).join('');
        } },
      { key: 'stage', label: '阶段判断', render: function (c) {
          return '<span class="small">' + App.esc(rowDataOf(c).stageJudge) + '</span>';
        } },
      { key: 'risk', label: '风险提示', render: function (c) {
          return '<span class="text-warn small">' + App.esc(rowDataOf(c).risk) + '</span>';
        } },
      { key: 'action', label: '建议动作', render: function (c) {
          return '<span class="small">' + App.esc(rowDataOf(c).action) + '</span>';
        } },
      { key: 'tags', label: '建议标签', render: function (c) {
          var tags = rowDataOf(c).autoTags;
          if (!tags.length) return '<span class="muted small">—</span>';
          return tags.map(function (t) {
            return '<span class="chip chip-accent">' + App.esc(t) + '</span>';
          }).join('');
        } }
    ], customers);

    // 沉睡客户
    var wakeHtml = sleeping.length ? sleeping.map(function (c) {
      return '<div class="wake-row">' +
        App.ui.avatar(c.name, true) +
        '<div style="flex:1"><b>' + App.esc(c.name) + '</b> <span class="small muted">' + App.esc(c.flag || '') + ' ' + App.esc(c.country) + ' · ' + App.esc(c.company) + '</span>' +
        '<div class="small muted">最后联系：' + App.esc(c.lastContact) + ' · 预估金额 ' + App.fmt.money(c.value) + '</div></div>' +
        '<button class="btn btn-sm" data-wake="' + App.esc(c.id) + '">生成唤醒话术</button>' +
        '</div>';
    }).join('') : App.ui.empty('暂无待唤醒客户');

    el.innerHTML =
      styleBlock() +
      '<div class="mod-analysis">' +

      // 顶部标题行 + 重新扫描
      '<div class="row-between mb12">' +
      '<div style="font-size:15px;font-weight:600">存量客户分析报告 <span class="small muted" style="font-weight:400">基于 14 个真实样本（模拟 1,000 会话）</span></div>' +
      '<button class="btn btn-sm" id="ana-rescan">重新扫描</button>' +
      '</div>' +

      // KPI 行
      '<div class="grid grid-4 mb12">' +
      App.ui.kpi('分析客户数', String(customers.length), '演示样本 · 正式版对接全量会话') +
      App.ui.kpi('A 类强意向', String(aCount), '<span class="text-bad">建议 48 小时内重点跟进</span>') +
      App.ui.kpi('待唤醒客户', String(sleeping.length), '<span class="text-warn">合计 ' + App.fmt.money(sleeping.reduce(function (s, c) { return s + (c.value || 0); }, 0)) + ' 沉睡金额</span>') +
      App.ui.kpi('平均未跟进天数', MOCK_AVG_IDLE_DAYS + ' 天', '演示 mock 值 · 超 7 天即预警') +
      '</div>' +

      // 图表行
      '<div class="grid grid-3 mb12">' +
      '<div class="card mb0"><div class="card-title">意向分布</div>' + App.ui.svgBars(intentBars, { labelWidth: '54px' }) + '</div>' +
      '<div class="card mb0"><div class="card-title">客户类型分布</div>' + App.ui.svgBars(typeBars, { labelWidth: '128px', color: 'var(--purple)' }) + '</div>' +
      '<div class="card mb0"><div class="card-title">国家 TOP 5</div>' + App.ui.svgBars(countryBars, { labelWidth: '70px', color: 'var(--info)' }) + '</div>' +
      '</div>' +

      // 明细表
      '<div class="card">' +
      '<div class="card-title">逐客户画像明细 <span class="sub">AI 从会话中提取</span></div>' +
      '<div class="mb12"><button class="btn btn-primary btn-sm" id="ana-apply"' + (tagsApplied ? ' disabled' : '') + '>' +
      (tagsApplied ? '标签已应用到 CRM' : '一键应用标签到 CRM') + '</button>' +
      '<span class="small muted" style="margin-left:10px">把 AI 建议标签合并进客户档案（去重，不覆盖人工标签）</span></div>' +
      tableHtml +
      '</div>' +

      // 沉睡客户卡
      '<div class="card">' +
      '<div class="card-title">沉睡客户唤醒 <span class="sub">标签含「待唤醒」· 值得再碰一次的钱</span></div>' +
      wakeHtml +
      '</div>' +

      '</div>';

    // ---- 事件绑定（innerHTML 之后） ----

    el.querySelector('#ana-rescan').onclick = function () {
      viewState = 'initial';
      render(el);
    };

    var applyBtn = el.querySelector('#ana-apply');
    applyBtn.onclick = function () {
      var ids = Object.keys(findings);
      ids.forEach(function (id) {
        var c = App.findCustomer(id);
        if (!c) return;
        c.tags = c.tags || [];
        (findings[id].autoTags || []).forEach(function (t) {
          if (c.tags.indexOf(t) < 0) c.tags.push(t);
        });
      });
      tagsApplied = true;
      applyBtn.disabled = true;
      applyBtn.textContent = '标签已应用到 CRM';
      App.ui.toast('已把 AI 标签应用到 ' + ids.length + ' 个客户档案', 'ok');
    };

    el.querySelectorAll('[data-wake]').forEach(function (btn) {
      btn.onclick = function () {
        var c = App.findCustomer(btn.getAttribute('data-wake'));
        if (c) openWakeModal(c);
      };
    });
  }

  /* ---------- 唤醒话术弹窗 ---------- */

  function openWakeModal(c) {
    App.ui.modal(
      '唤醒话术 · ' + c.name + '（' + c.company + '）',
      '<div class="mod-analysis">' +
      '<div class="small muted mb8">' + App.esc((c.flag || '') + ' ' + c.country + ' · ' + c.type + ' · 最后联系 ' + c.lastContact + ' · 预估 ') + App.fmt.money(c.value) + '</div>' +
      '<div id="wake-think"></div>' +
      '<div class="wake-out" id="wake-out" style="display:none"></div>' +
      '</div>',
      '<button class="btn" id="wake-close">关闭</button>' +
      '<button class="btn btn-ok" id="wake-copy" disabled>复制到 WhatsApp</button>'
    );

    document.getElementById('wake-close').onclick = App.ui.closeModal;

    var copyBtn = document.getElementById('wake-copy');
    copyBtn.onclick = function () {
      if ((App.data.chats || {})[c.id]) {
        App.state.waTarget = c.id;
        App.ui.closeModal();
        App.ui.toast('唤醒话术已带入 WhatsApp 工作台，定位到 ' + c.name);
        App.navigate('whatsapp');
      } else {
        App.ui.toast('演示样本无此客户会话');
      }
    };

    // AI 过程感：thinking → 打字机输出
    (async function () {
      var thinkEl = document.getElementById('wake-think');
      var stop = App.ai.thinking(thinkEl, '正在结合客户画像与断联原因，定制唤醒消息…');
      await App.ai.delay(1600);
      stop();
      var outEl = document.getElementById('wake-out');
      if (!outEl || !document.body.contains(outEl)) return; // 弹窗已被关闭
      outEl.style.display = 'block';
      await App.ai.typeInto(outEl, wakeMessageOf(c), 90);
      var btn = document.getElementById('wake-copy');
      if (btn) btn.disabled = false;
    })();
  }

  /* ---------- 注册 ---------- */

  App.registerModule({
    id: 'analysis',
    nav: { section: '销转端', label: '存量客户分析', icon: '📊' },
    render: render
  });
})();
