/* ============ 模块：广告投放自动化 ============
 * 从文案素材到广告账户自动建系列/建计划/投放，按数据自动优化，
 * 产出线索直接进线索池。
 * 数据来源：App.data.adAccounts / campaigns / adSuggestions / leadsPool / icp / products / videoTemplates
 */
(function () {
  'use strict';

  /* ---------- 模块私有状态（仅内存，刷新即还原） ---------- */
  var state = {
    tab: 'overview',        // overview | plan | optimize | leads
    adopted: {},            // 智能优化：已采纳的建议 idx
    ignored: {},            // 智能优化：已忽略的建议 idx
    synced: {},             // 广告线索：已转入线索池的 id
    lastScan: '今天 09:30', // 上次巡检时间
    seq: 0                  // 新建系列自增序号
  };

  /* ---------- 模块私有 mock：广告实时进线（未入池部分） ---------- */
  var MOCK_AD_LEADS = [
    { id: 'adl1', name: 'Sarah Brown', country: '英国', time: '今天 11:40', msg: '广告进线：想做花园办公室，问 EH-20 价格和到英国的运费' },
    { id: 'adl2', name: 'Kevin Miller', country: '美国', time: '今天 13:05', msg: '广告进线：看到 Facebook 安装延时广告，问单套价格、能否发到佛罗里达' }
  ];

  /* 每个素材模板对应的广告文案钩子（预览用） */
  var CREATIVE_HOOKS = {
    '工厂流水线快剪型': 'This is where your house begins — factory direct, DM for quote',
    '产品360°展开演示型': 'One container unfolds into 36㎡ — bathroom & kitchen pre-installed',
    '30秒安装延时型': 'Empty lot to livable in one day — DM "QUOTE" for pricing',
    '客户案例故事型': 'Texas host: payback in 14 months — DM "CASES" for real numbers',
    '痛点字幕解说型': 'Fixed price. Fixed timeline. Move-in ready. — Free budget sheet, DM us'
  };

  function hookOf(name) {
    return CREATIVE_HOOKS[name] || 'Factory direct expandable houses — DM for today’s quote';
  }

  /* ============================================================ 渲染入口 */
  function render(el) {
    var d = App.data;

    el.innerHTML =
      '<style>' +
      '.mod-ads .acct-card{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}' +
      '.mod-ads .acct-nums{display:flex;gap:26px;text-align:right}' +
      '.mod-ads .acct-num-label{font-size:11px;color:var(--muted);margin-bottom:3px}' +
      '.mod-ads .acct-num-val{font-size:18px;font-weight:700}' +
      '.mod-ads .cp-head-left{display:flex;align-items:center;gap:10px;flex-wrap:wrap}' +
      '.mod-ads .adset-row td{background:#f8fafc;font-size:12.5px;padding:7px 10px}' +
      '.mod-ads .total-row td{font-weight:600;background:#fbfcfe}' +
      '.mod-ads .tree-camp{border:1px solid #dbe4ff;background:#f8faff;border-radius:10px;padding:12px 14px;margin-bottom:10px}' +
      '.mod-ads .tree-adset{margin-left:24px;border:1px solid var(--line);border-left:3px solid var(--accent);background:#fff;border-radius:8px;padding:10px 12px;margin-bottom:8px}' +
      '.mod-ads .tree-ad{margin-left:48px;border:1px dashed var(--line);background:#fff;border-radius:8px;padding:8px 12px;margin-bottom:8px;font-size:13px}' +
      '.mod-ads .sug-card{transition:opacity .25s}' +
      '.mod-ads .sug-card.ignored{opacity:.45}' +
      '</style>' +

      '<div class="mod-ads">' +

      /* ---------- 顶部：广告账户卡片 ---------- */
      '<div class="grid grid-2 mb12">' +
      d.adAccounts.map(function (a) {
        return '<div class="card mb0"><div class="acct-card">' +
          '<div>' +
          '<div class="row" style="gap:8px;margin-bottom:6px">' +
          App.ui.badge(a.platform, a.platform === 'Facebook' ? 'accent' : 'info') +
          '<span class="bold">' + App.esc(a.account) + '</span>' +
          App.ui.badge(a.status, a.status === '正常' ? 'ok' : 'bad') +
          '</div>' +
          '<div class="small muted">账户 ID：' + App.esc(a.accountId) + '</div>' +
          '</div>' +
          '<div class="acct-nums">' +
          '<div><div class="acct-num-label">账户余额</div><div class="acct-num-val">' + App.fmt.money(a.balance) + '</div></div>' +
          '<div><div class="acct-num-label">本月消耗</div><div class="acct-num-val text-accent">' + App.fmt.money(a.spendMonth) + '</div></div>' +
          '</div>' +
          '</div></div>';
      }).join('') +
      '</div>' +

      /* ---------- Tabs ---------- */
      '<div class="tabs" id="ads-tabs">' +
      [
        { id: 'overview', label: '投放总览' },
        { id: 'plan', label: 'AI 建计划' },
        { id: 'optimize', label: '智能优化' },
        { id: 'leads', label: '广告线索' }
      ].map(function (t) {
        return '<div class="tab' + (state.tab === t.id ? ' active' : '') + '" data-tab="' + t.id + '">' + t.label + '</div>';
      }).join('') +
      '</div>' +

      '<div id="ads-body"></div>' +
      '</div>';

    // Tab 切换：直接重画整个模块容器
    el.querySelectorAll('#ads-tabs .tab').forEach(function (tabEl) {
      tabEl.onclick = function () {
        state.tab = tabEl.getAttribute('data-tab');
        render(el);
      };
    });

    var body = el.querySelector('#ads-body');
    if (state.tab === 'overview') renderOverview(body, el);
    else if (state.tab === 'plan') renderPlan(body, el);
    else if (state.tab === 'optimize') renderOptimize(body, el);
    else renderLeads(body);
  }

  /* ============================================================ Tab 1：投放总览 */
  function cplCell(ad) {
    if (!ad.impressions) return '<span class="muted">-</span>';
    var cls = ad.cpl > 130 ? 'text-bad' : (ad.cpl < 60 ? 'text-ok' : '');
    return '<span class="bold ' + cls + '">' + App.fmt.money(ad.cpl) + '</span>';
  }

  function renderOverview(body, rootEl) {
    var campaigns = App.data.campaigns;

    body.innerHTML = campaigns.map(function (cp) {
      // 状态控件：审核中显示徽章；投放中/已暂停显示开关
      var statusCtrl;
      if (cp.status === '审核中') {
        statusCtrl = App.ui.badge('审核中', 'warn') + '<span class="small muted">平台审核约 1-24 小时</span>';
      } else {
        statusCtrl =
          '<span class="small ' + (cp.status === '投放中' ? 'text-ok' : 'muted') + '">' + App.esc(cp.status) + '</span>' +
          '<span class="switch' + (cp.status === '投放中' ? ' on' : '') + '" data-cpswitch="' + App.esc(cp.id) + '" title="点击切换投放状态"></span>';
      }

      var totalSpend = 0, totalLeads = 0, totalImp = 0, totalClicks = 0;

      var rows = cp.adsets.map(function (as) {
        var group = '<tr class="adset-row"><td colspan="7">▸ <b>' + App.esc(as.name) + '</b>' +
          ' <span class="muted">｜受众：' + App.esc(as.audience) + '</span></td></tr>';
        var adRows = as.ads.map(function (ad) {
          totalSpend += ad.spend; totalLeads += ad.leads; totalImp += ad.impressions; totalClicks += ad.clicks;
          return '<tr>' +
            '<td>' + App.esc(ad.name) + '<div class="small muted">' + App.esc(ad.creative) + '</div></td>' +
            '<td>' + App.fmt.num(ad.impressions) + '</td>' +
            '<td>' + App.fmt.num(ad.clicks) + '</td>' +
            '<td>' + (ad.impressions ? App.fmt.pct(ad.ctr) : '<span class="muted">-</span>') + '</td>' +
            '<td>' + App.fmt.money(ad.spend) + '</td>' +
            '<td>' + App.fmt.num(ad.leads) + '</td>' +
            '<td>' + cplCell(ad) + '</td>' +
            '</tr>';
        }).join('');
        return group + adRows;
      }).join('');

      var avgCpl = totalLeads ? Math.round(totalSpend / totalLeads) : 0;
      var totalRow = '<tr class="total-row">' +
        '<td>系列合计</td>' +
        '<td>' + App.fmt.num(totalImp) + '</td>' +
        '<td>' + App.fmt.num(totalClicks) + '</td>' +
        '<td>' + (totalImp ? App.fmt.pct(totalClicks / totalImp * 100) : '-') + '</td>' +
        '<td>' + App.fmt.money(totalSpend) + '</td>' +
        '<td>' + App.fmt.num(totalLeads) + '</td>' +
        '<td>' + (totalLeads ? App.fmt.money(avgCpl) : '<span class="muted">-</span>') + '</td>' +
        '</tr>';

      return '<div class="card">' +
        '<div class="row-between mb12">' +
        '<div class="cp-head-left">' +
        '<span class="bold">' + App.esc(cp.name) + '</span>' +
        App.ui.badge(cp.platform, cp.platform === 'Facebook' ? 'accent' : 'info') +
        App.ui.badge(cp.objective, 'gray') +
        '<span class="small muted">日预算 $' + App.esc(cp.budget) + '/日</span>' +
        '</div>' +
        '<div class="row" style="gap:8px">' + statusCtrl + '</div>' +
        '</div>' +
        '<table class="tbl"><thead><tr>' +
        '<th>素材/广告</th><th>展示</th><th>点击</th><th>CTR</th><th>花费</th><th>线索</th><th>CPL</th>' +
        '</tr></thead><tbody>' + rows + totalRow + '</tbody></table>' +
        '</div>';
    }).join('');

    // 投放状态开关
    body.querySelectorAll('[data-cpswitch]').forEach(function (sw) {
      sw.onclick = function () {
        var id = sw.getAttribute('data-cpswitch');
        var cp = null;
        for (var i = 0; i < App.data.campaigns.length; i++) {
          if (App.data.campaigns[i].id === id) { cp = App.data.campaigns[i]; break; }
        }
        if (!cp) return;
        cp.status = cp.status === '投放中' ? '已暂停' : '投放中';
        App.ui.toast(cp.status === '投放中'
          ? '「' + cp.name + '」已恢复投放（演示环境：正式版同步至广告平台）'
          : '「' + cp.name + '」已暂停投放（演示环境：正式版同步至广告平台）');
        renderOverview(body, rootEl);
      };
    });
  }

  /* ============================================================ Tab 2：AI 建计划 */
  function renderPlan(body, rootEl) {
    var d = App.data;

    function selectHtml(id, options) {
      return '<select class="select" id="' + id + '">' +
        options.map(function (o) { return '<option>' + App.esc(o) + '</option>'; }).join('') +
        '</select>';
    }

    body.innerHTML =
      '<div class="card">' +
      '<div class="card-title">AI 建计划向导 <span class="sub">选定目标，AI 自动生成「系列 → 广告组 → 广告」完整投放结构</span></div>' +
      '<div class="grid grid-3">' +
      '<div class="field"><label class="field-label">目标市场</label>' + selectHtml('ads-f-market', d.icp.countries) + '</div>' +
      '<div class="field"><label class="field-label">客户类型</label>' + selectHtml('ads-f-type', d.icp.companyTypes) + '</div>' +
      '<div class="field"><label class="field-label">日预算（美元）</label><input class="input" id="ads-f-budget" type="number" min="10" value="100"></div>' +
      '<div class="field"><label class="field-label">推广产品</label>' + selectHtml('ads-f-product', d.products.map(function (p) { return p.name; })) + '</div>' +
      '<div class="field"><label class="field-label">首选素材</label>' + selectHtml('ads-f-creative', d.videoTemplates.map(function (t) { return t.name; })) + '</div>' +
      '<div class="field" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-block" id="ads-gen-btn">✨ AI 生成投放结构</button></div>' +
      '</div>' +
      '<div class="notice">AI 将结合账户历史 CPL、素材表现与 ICP 画像自动搭建结构；生成后需人工确认才会创建，不会直接花钱。</div>' +
      '</div>' +
      '<div id="ads-plan-preview"></div>';

    var genBtn = body.querySelector('#ads-gen-btn');
    var preview = body.querySelector('#ads-plan-preview');

    genBtn.onclick = function () { generatePlan(body, rootEl, genBtn, preview); };
  }

  function generatePlan(body, rootEl, genBtn, preview) {
    var market = body.querySelector('#ads-f-market').value;
    var ctype = body.querySelector('#ads-f-type').value;
    var budget = Number(body.querySelector('#ads-f-budget').value) || 100;
    var productName = body.querySelector('#ads-f-product').value;
    var creative1 = body.querySelector('#ads-f-creative').value;

    // 搭配素材：首选之外自动补一条表现型素材做 A/B
    var creative2 = creative1 === '30秒安装延时型' ? '客户案例故事型' : '30秒安装延时型';
    var creative3 = '痛点字幕解说型' === creative1 ? '产品360°展开演示型' : '痛点字幕解说型';

    // 从产品名提取型号前缀（如 EH-20）
    var pid = productName.split(' ')[0];
    var cpName = market + '-' + ctype + '-' + pid + '-7月';

    var plan = {
      name: cpName,
      budget: budget,
      market: market,
      adsets: [
        {
          name: '兴趣定向组-' + market,
          audience: market + ' 30-60岁，兴趣: ' + App.data.icp.keywords.slice(0, 3).join(' / ') + '，倾向角色: ' + App.data.icp.roles[0] + '，匹配「' + ctype + '」画像',
          ads: [
            { creative: creative1, hook: hookOf(creative1) },
            { creative: creative2, hook: hookOf(creative2) }
          ]
        },
        {
          name: '再营销组-' + market,
          audience: '过去 30 天视频观看 ≥50% + 主页/落地页互动人群，排除已提交表单用户',
          ads: [
            { creative: creative3, hook: hookOf(creative3) },
            { creative: '客户案例故事型', hook: hookOf('客户案例故事型') }
          ]
        }
      ],
      bidLine: '出价策略：冷启动 7 天用最高成交量（Lowest Cost）跑学习期，稳定后切换成本上限出价，目标 CPL ≤ $110（账户当前均值 $115）',
      placeLine: '版位建议：Facebook/Instagram Feed + Reels 自动版位为主，排除 Audience Network 低质流量；预算 7:3 分配给兴趣组 : 再营销组'
    };

    var runGen = (function () {
      genBtn.disabled = true;
      preview.innerHTML = '<div class="card"><div id="ads-think-box"></div></div>';
      var thinkBox = preview.querySelector('#ads-think-box');
      var stop = App.ai.thinking(thinkBox, '正在分析账户历史 CPL、素材表现与「' + market + ' · ' + ctype + '」受众画像…');

      return App.ai.delay(1900).then(function () {
        stop();
        genBtn.disabled = false;

        var adSeq = 0;
        preview.innerHTML =
          '<div class="card">' +
          '<div class="card-title">AI 生成的投放结构 <span class="sub">确认无误后一键创建</span></div>' +
          '<div class="ai-box mb12"><span class="ai-tag">AI</span> <span id="ads-plan-summary" class="small" style="line-height:1.7"></span></div>' +

          '<div class="tree-camp">📣 <b>系列：' + App.esc(plan.name) + '</b>' +
          ' ' + App.ui.badge('线索收集', 'accent') +
          ' <span class="small muted">日预算 $' + App.esc(plan.budget) + '/日 · Facebook</span></div>' +

          plan.adsets.map(function (as) {
            return '<div class="tree-adset">👥 <b>广告组：' + App.esc(as.name) + '</b>' +
              '<div class="small muted mt8">受众定义：' + App.esc(as.audience) + '</div></div>' +
              as.ads.map(function (ad) {
                adSeq++;
                return '<div class="tree-ad">🎬 <b>广告 ' + adSeq + '</b> · 素材「' + App.esc(ad.creative) + '」' +
                  '<div class="small muted mt8">文案钩子：' + App.esc(ad.hook) + '</div></div>';
              }).join('');
          }).join('') +

          '<div class="notice mt12">💰 ' + App.esc(plan.bidLine) + '</div>' +
          '<div class="notice">📱 ' + App.esc(plan.placeLine) + '</div>' +

          '<div class="row mt12">' +
          '<button class="btn btn-ok" id="ads-confirm-btn">✔ 确认创建</button>' +
          '<button class="btn" id="ads-regen-btn">↺ 换一版结构</button>' +
          '</div>' +
          '</div>';

        var summaryEl = preview.querySelector('#ads-plan-summary');
        var summaryText = '结构解读：为「' + market + ' · ' + ctype + '」搭建 1 个线索收集系列。兴趣定向组负责拉新，' +
          '再营销组承接看过视频的温热人群（历史 CPL $46，账户最优）；每组 2 条广告跑 A/B，学习期后自动向低 CPL 素材倾斜预算。';

        preview.querySelector('#ads-confirm-btn').onclick = function () { confirmCreate(plan, rootEl); };
        preview.querySelector('#ads-regen-btn').onclick = function () {
          App.ui.toast('已按新随机种子重排结构');
          generatePlan(body, rootEl, genBtn, preview);
        };

        return App.ai.typeInto(summaryEl, summaryText, 70);
      });
    })();

    runGen.catch(function (e) { console.error('生成投放结构出错:', e); genBtn.disabled = false; });
  }

  function confirmCreate(plan, rootEl) {
    state.seq++;
    var as = plan.adsets[0];
    App.data.campaigns.push({
      id: 'cp-new-' + state.seq,
      name: plan.name,
      platform: 'Facebook',
      objective: '线索收集',
      budget: plan.budget,
      status: '审核中',
      adsets: [
        {
          name: as.name,
          audience: as.audience,
          ads: as.ads.map(function (ad, i) {
            return { name: ad.creative + '-' + (i === 0 ? 'A' : 'B'), creative: ad.creative, impressions: 0, clicks: 0, ctr: 0, spend: 0, leads: 0, cpl: 0 };
          })
        }
      ]
    });
    App.ui.toast('已创建（演示环境：正式版通过 Facebook/Google Marketing API 自动下发）', 'ok');
    state.tab = 'overview';
    render(rootEl);
  }

  /* ============================================================ Tab 3：智能优化 */
  function renderOptimize(body, rootEl) {
    var sugs = App.data.adSuggestions;
    var sevMap = { high: { label: '高优先', type: 'bad' }, mid: { label: '中优先', type: 'warn' }, low: { label: '低优先', type: 'gray' } };

    body.innerHTML =
      '<div class="row-between mb12">' +
      '<div class="small muted">AI 每日 09:30 自动巡检全部系列，按 CPL / CTR / 预算利用率给出优化建议 · 上次巡检：' + App.esc(state.lastScan) + '</div>' +
      '<button class="btn btn-primary" id="ads-scan-btn">🔍 让 AI 重新巡检</button>' +
      '</div>' +
      '<div id="ads-scan-box"></div>' +

      sugs.map(function (s, idx) {
        var sev = sevMap[s.severity] || sevMap.low;
        var adopted = !!state.adopted[idx];
        var ignored = !!state.ignored[idx];
        return '<div class="card sug-card' + (ignored ? ' ignored' : '') + '" data-sug="' + idx + '">' +
          '<div class="row-between">' +
          '<div>' +
          '<div class="row" style="gap:8px;margin-bottom:6px">' +
          App.ui.badge(sev.label, sev.type) +
          '<span class="bold">' + App.esc(s.title) + '</span>' +
          (ignored ? App.ui.badge('已忽略', 'gray') : '') +
          '</div>' +
          '<div class="small muted">建议：' + App.esc(s.advice) + '</div>' +
          '<div class="mt8"><span class="chip chip-accent">操作：' + App.esc(s.action) + '</span></div>' +
          '</div>' +
          '<div class="row" style="gap:8px;flex-shrink:0">' +
          '<button class="btn btn-primary btn-sm" data-adopt="' + idx + '"' + ((adopted || ignored) ? ' disabled' : '') + '>' + (adopted ? '已执行' : '采纳') + '</button>' +
          '<button class="btn btn-sm" data-ignore="' + idx + '"' + ((adopted || ignored) ? ' disabled' : '') + '>忽略</button>' +
          '</div>' +
          '</div>' +
          '</div>';
      }).join('') +

      '<div class="notice">🛡️ 放权节奏：初期为「AI 建议 + 人工确认」模式，所有操作需点击采纳才执行；连续 4 周建议采纳率与效果验证达标后，将逐步放开低风险动作（加否定词、小幅调预算）的自动执行权限。</div>';

    // 重新巡检
    var scanBtn = body.querySelector('#ads-scan-btn');
    scanBtn.onclick = function () {
      scanBtn.disabled = true;
      var scanBox = body.querySelector('#ads-scan-box');
      scanBox.innerHTML = '';
      var stop = App.ai.thinking(scanBox, '正在拉取近 7 天分素材数据，对比目标 CPL 与账户基准…');
      App.ai.delay(1600).then(function () {
        stop();
        scanBtn.disabled = false;
        state.lastScan = '刚刚';
        App.ui.toast('巡检完成：4 条建议', 'ok');
        renderOptimize(body, rootEl);
      });
    };

    // 采纳
    body.querySelectorAll('[data-adopt]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = Number(btn.getAttribute('data-adopt'));
        state.adopted[idx] = true;
        App.ui.toast('已执行：' + App.data.adSuggestions[idx].action + '（演示环境：正式版调用广告平台 API 生效）', 'ok');
        renderOptimize(body, rootEl);
      };
    });

    // 忽略
    body.querySelectorAll('[data-ignore]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = Number(btn.getAttribute('data-ignore'));
        state.ignored[idx] = true;
        App.ui.toast('已忽略该建议，本轮巡检不再提醒');
        renderOptimize(body, rootEl);
      };
    });
  }

  /* ============================================================ Tab 4：广告线索 */
  function renderLeads(body) {
    // 线索池中来源为广告投放的 + 模块私有 mock（按姓名去重，避免与池内重复）
    var poolLeads = App.data.leadsPool.filter(function (l) { return l.source === '广告投放'; });
    var poolNames = {};
    poolLeads.forEach(function (l) { poolNames[l.name] = true; });
    var merged = poolLeads.concat(MOCK_AD_LEADS.filter(function (m) { return !poolNames[m.name]; }));

    body.innerHTML =
      '<div class="card">' +
      '<div class="card-title">广告产出线索 <span class="sub">表单/私信进线实时回传，一键同步线索池分配跟进</span></div>' +
      App.ui.table([
        { key: 'name', label: '姓名', render: function (r) { return App.ui.avatar(r.name, true) + ' <b>' + App.esc(r.name) + '</b>'; } },
        { key: 'country', label: '国家', render: function (r) { return App.esc(r.country); } },
        { key: 'msg', label: '首条消息', render: function (r) { return '<span class="small">' + App.esc(r.msg) + '</span>'; } },
        { key: 'time', label: '时间', render: function (r) { return '<span class="small muted">' + App.esc(r.time) + '</span>'; } },
        {
          key: 'op', label: '操作', width: '110px', render: function (r) {
            var done = !!state.synced[r.id];
            return '<button class="btn btn-sm' + (done ? '' : ' btn-primary') + '" data-tolead="' + App.esc(r.id) + '"' + (done ? ' disabled' : '') + '>' +
              (done ? '已转入' : '转入线索池') + '</button>';
          }
        }
      ], merged, { emptyMsg: '暂无广告线索' }) +
      '<div class="notice mt12">📥 正式版：广告平台 Lead Form / Messenger 进线通过 Webhook 实时回传，自动写入线索池并触发初筛客服 AI 首轮接待。</div>' +
      '</div>';

    body.querySelectorAll('[data-tolead]').forEach(function (btn) {
      btn.onclick = function () {
        state.synced[btn.getAttribute('data-tolead')] = true;
        btn.disabled = true;
        btn.textContent = '已转入';
        btn.classList.remove('btn-primary');
        App.ui.toast('已同步线索池', 'ok');
      };
    });
  }

  /* ============================================================ 注册 */
  App.registerModule({
    id: 'ads',
    nav: { section: '流量端', label: '广告投放自动化', icon: '📣' },
    render: render
  });
})();
