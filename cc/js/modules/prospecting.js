/* ============ 模块：主动客户开发（流量端） ============
 * 按 ICP 从谷歌/领英/海关数据批量找潜客 → AI 打分判定 →
 * 邮件+WhatsApp 序列触达 → 客户一回复即成线索。
 * 约定：IIFE 包裹、数据读 App.data、私有样式以 .mod-prospecting 开头、
 *       事件绑定在 innerHTML 之后、动态数据一律 App.esc() 转义。
 */
(function () {
  'use strict';

  /* ---------- 模块私有状态 ---------- */
  var state = { tab: 'icp', chKw: null, chCountry: null };
  var converted = {};    // prospectId -> true：该回复已转入线索池
  var leadSeq = 100;     // 生成线索 id 的自增序号
  var harvest = null;    // 一键全渠道获客的结果（本次会话内保留）
  var harvestSel = {};   // 结果表勾选状态 index -> true
  var harvesting = false;

  var TABS = [
    { id: 'icp', label: '目标画像 ICP' },
    { id: 'channels', label: '获客渠道' },
    { id: 'discover', label: '潜客发现' },
    { id: 'sequence', label: '触达序列' },
    { id: 'inbox', label: '回复收件箱' }
  ];

  /* 目标国家中文 → 搜索用英文（用于拼各平台搜索词） */
  var COUNTRY_EN = {
    '美国': 'USA', '加拿大': 'Canada', '澳大利亚': 'Australia', '新西兰': 'New Zealand',
    '德国': 'Germany', '法国': 'France', '英国': 'UK', '北欧': 'Scandinavia',
    '阿联酋': 'UAE', '沙特': 'Saudi Arabia', '中东': 'Middle East', '东南亚': 'Southeast Asia',
    '新加坡': 'Singapore', '越南': 'Vietnam', '泰国': 'Thailand', '菲律宾': 'Philippines',
    '日本': 'Japan', '韩国': 'South Korea', '巴西': 'Brazil', '墨西哥': 'Mexico',
    '南非': 'South Africa', '瑞典': 'Sweden', '挪威': 'Norway', '芬兰': 'Finland',
    '荷兰': 'Netherlands', '西班牙': 'Spain', '意大利': 'Italy', '波兰': 'Poland'
  };
  function countryEn(c) { return COUNTRY_EN[c] || c; }

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
    else if (state.tab === 'channels') renderChannels(body);
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
      '<div class="card"><div class="card-title"><span>我的行业 / 产品 <span class="sub">获客渠道与搜索词都基于它自动生成</span></span></div>' +
      '<div class="row">' +
      '<input class="input" id="icp-industry" style="flex:1" placeholder="建议填英文，例如：modular homes / container house" value="' + App.esc(icp.industry || '') + '">' +
      '<button class="btn btn-primary" id="icp-industry-save">保存</button>' +
      '</div>' +
      '<div class="small muted mt8">填你卖的产品或所在行业（英文效果最好），保存后「获客渠道」页签会按它 + 目标国家自动拼好各平台搜索。</div>' +
      '</div>' +

      '<div class="grid grid-2">' +

      // ① 目标市场与角色
      '<div class="card mb0"><div class="card-title"><span>目标市场与角色 <span class="sub">谁是我们的理想客户</span></span></div>' +
      '<div class="field-label">目标国家/地区（点 × 移除）</div><div class="mb8" id="icp-countries">' +
      icp.countries.map(function (c) { return App.ui.chip(c, true); }).join('') + '</div>' +
      '<div class="row mb12">' +
      '<input class="input" id="icp-country-input" style="flex:1" placeholder="输入国家/地区，如 英国、墨西哥">' +
      '<button class="btn" id="icp-country-add">添加</button>' +
      '</div>' +
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
      '<div class="small muted mt8">点击关键词右侧 × 可移除；改动保存在本浏览器，「获客渠道」即时生效。</div>' +
      '</div>' +
      '</div>' +

      // ③ AI 打分规则
      '<div class="card mt16"><div class="card-title"><span>AI 打分规则 <span class="sub">权重可直接修改，AI 按合计权重归一化打分</span></span></div>' +
      '<table class="tbl"><thead><tr><th>评分规则</th><th style="width:130px">权重</th></tr></thead>' +
      '<tbody>' + rulesRows + '</tbody>' +
      '<tfoot><tr><td class="bold">合计权重</td><td class="bold" id="icp-wsum">' + weightSumHtml() + '</td></tr></tfoot>' +
      '</table></div>';

    // 事件：保存行业/产品
    function saveIndustry() {
      var v = (body.querySelector('#icp-industry').value || '').trim();
      if (!v) { App.ui.toast('请先填写行业/产品', 'bad'); return; }
      App.data.icp.industry = v;
      state.chKw = null; // 让获客渠道重新取默认关键词
      App.persist();
      App.ui.toast('已保存，「获客渠道」的搜索词已按新行业更新', 'ok');
    }
    body.querySelector('#icp-industry-save').onclick = saveIndustry;
    body.querySelector('#icp-industry').onkeydown = function (e) {
      if (e.key === 'Enter') saveIndustry();
    };

    // 事件：添加/移除目标国家
    function addCountry() {
      var inp = body.querySelector('#icp-country-input');
      var v = (inp.value || '').trim();
      if (!v) { App.ui.toast('请先输入国家/地区'); return; }
      if (App.data.icp.countries.indexOf(v) >= 0) { App.ui.toast('该国家/地区已存在'); return; }
      App.data.icp.countries.push(v);
      App.persist();
      App.ui.toast('已添加目标市场「' + v + '」', 'ok');
      renderIcp(body);
    }
    body.querySelector('#icp-country-add').onclick = addCountry;
    body.querySelector('#icp-country-input').onkeydown = function (e) {
      if (e.key === 'Enter') addCountry();
    };
    body.querySelectorAll('#icp-countries .x').forEach(function (x) {
      x.onclick = function () {
        var c = x.getAttribute('data-chip');
        var arr = App.data.icp.countries;
        var idx = arr.indexOf(c);
        if (idx >= 0) arr.splice(idx, 1);
        if (state.chCountry === c) state.chCountry = null;
        App.persist();
        App.ui.toast('已移除「' + c + '」');
        renderIcp(body);
      };
    });

    // 事件：添加关键词
    function addKeyword() {
      var inp = body.querySelector('#icp-kw-input');
      var v = (inp.value || '').trim();
      if (!v) { App.ui.toast('请先输入关键词'); return; }
      if (App.data.icp.keywords.indexOf(v) >= 0) { App.ui.toast('该关键词已存在'); return; }
      App.data.icp.keywords.push(v);
      App.persist();
      App.ui.toast('关键词已添加，获客渠道即时生效');
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
        if (state.chKw === k) state.chKw = null;
        App.persist();
        App.ui.toast('关键词已移除');
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
        App.persist();
        App.ui.toast('权重已更新，下轮评分生效');
      };
    });
  }

  /* ============ Tab 2：获客渠道 ============ */
  function gq(q) { return 'https://www.google.com/search?q=' + encodeURIComponent(q); }

  function buildChannels(kw, cEn) {
    return [
      {
        icon: '🔍', name: 'Google 搜索', tag: '最常用',
        what: '目标客户官网、经销商/进口商名单、"寻找供应商"帖子',
        how: '关键词 + 采购角色词 + 国家组合搜索；打开结果里的公司官网，进 Contact/About 页找负责人和邮箱。',
        links: [
          { label: '搜经销商', url: gq(kw + ' distributor ' + cEn + ' contact email') },
          { label: '搜批发/代理', url: gq(kw + ' dealer OR wholesaler ' + cEn) },
          { label: '搜进口商', url: gq(kw + ' importer ' + cEn) }
        ]
      },
      {
        icon: '🗺️', name: 'Google 地图', tag: '实体商家',
        what: '营地、度假村、民宿集群、建材市场等实体经营者（带电话和官网）',
        how: '按业态 + 国家/城市搜索，商家资料页直接有电话、官网，一家家点开官网找邮箱。',
        links: [
          { label: '营地/度假村', url: 'https://www.google.com/maps/search/' + encodeURIComponent('campground resort ' + cEn) },
          { label: '民宿/木屋', url: 'https://www.google.com/maps/search/' + encodeURIComponent('cabin rental glamping ' + cEn) },
          { label: '行业供应商', url: 'https://www.google.com/maps/search/' + encodeURIComponent(kw + ' ' + cEn) }
        ]
      },
      {
        icon: '💼', name: 'LinkedIn', tag: '找决策人',
        what: '目标公司主页 + 决策人（Owner / 采购经理 / 项目总监）',
        how: '先搜公司，进公司主页点 People 找决策角色；拿到人名和公司域名后用下方"找邮箱工具"反查邮箱。',
        links: [
          { label: '搜公司', url: 'https://www.linkedin.com/search/results/companies/?keywords=' + encodeURIComponent(kw + ' ' + cEn) },
          { label: '搜决策人', url: 'https://www.linkedin.com/search/results/people/?keywords=' + encodeURIComponent(kw + ' owner ' + cEn) }
        ]
      },
      {
        icon: '𝕏', name: 'X（推特）', tag: '活跃商家',
        what: '发过相关项目、求购信息的活跃账号和行业讨论',
        how: '搜产品词看"最新"，找到相关账号后看主页简介里的官网链接，或直接私信。',
        links: [
          { label: '搜最新讨论', url: 'https://x.com/search?q=' + encodeURIComponent(kw + ' ' + cEn) + '&f=live' },
          { label: '搜相关账号', url: 'https://x.com/search?q=' + encodeURIComponent(kw) + '&f=user' }
        ]
      },
      {
        icon: '▶️', name: 'YouTube', tag: '博主+买家',
        what: '行业博主（可谈测评合作）、搭建/开箱视频发布者、评论区里的意向买家',
        how: '搜产品词，进频道「简介/About」页常能看到商务邮箱；评论区问价的人也是潜在客户。',
        links: [
          { label: '搜产品视频', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(kw) },
          { label: '搜行业频道', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(kw + ' business ' + cEn) }
        ]
      },
      {
        icon: '📘', name: 'Facebook', tag: '群组',
        what: '行业群组（营地主群、民宿主群）和商家主页',
        how: '加入群组发帖/看求购帖，或直接私信商家主页；主页"关于"栏常有邮箱。',
        links: [
          { label: '搜主页', url: 'https://www.facebook.com/search/pages/?q=' + encodeURIComponent(kw + ' ' + cEn) },
          { label: '搜群组', url: 'https://www.facebook.com/search/groups/?q=' + encodeURIComponent(kw) }
        ]
      },
      {
        icon: '🚢', name: '海关数据', tag: '最精准',
        what: '真实进口过同类产品的公司名单 + 提单记录（谁在买、买了多少、从谁那买）',
        how: '按产品词或 HS 编码（预制建筑 9406）查进口商，拿到公司名后回 Google/LinkedIn 找负责人邮箱。ImportYeti 查美国免费。',
        links: [
          { label: 'ImportYeti（美国·免费）', url: 'https://www.importyeti.com/search?q=' + encodeURIComponent(kw) },
          { label: 'Volza（全球）', url: 'https://www.volza.com/' },
          { label: '搜 HS 9406 进口商', url: gq('HS 9406 prefabricated buildings importers ' + cEn) }
        ]
      },
      {
        icon: '🏢', name: 'B2B 目录 / 黄页', tag: '公司库',
        what: '按行业分类的公司名录（含联系方式）',
        how: '搜行业词筛选国家，逐个打开公司页拿官网和邮箱。',
        links: [
          { label: 'Europages（欧洲）', url: 'https://www.europages.co.uk/en/search?q=' + encodeURIComponent(kw) },
          { label: 'Kompass（全球）', url: 'https://www.kompass.com/searchCompanies?text=' + encodeURIComponent(kw) },
          { label: 'YellowPages（美国）', url: 'https://www.yellowpages.com/search?search_terms=' + encodeURIComponent(kw) }
        ]
      },
      {
        icon: '🎪', name: '行业展会名录', tag: '现成名单',
        what: '展商名录 = 一份现成的行业公司名单（都有官网和联系人）',
        how: 'Google 搜「展会名 + exhibitor list」，展商列表页通常直接给官网链接。',
        links: [
          { label: '搜行业展会', url: gq(kw + ' trade show ' + cEn + ' exhibitor list') },
          { label: '搜户外住宿展', url: gq('outdoor hospitality expo exhibitor list') }
        ]
      },
      {
        icon: '📧', name: '找邮箱工具', tag: '配套工具',
        what: '输入公司域名/人名，直接给出负责人邮箱',
        how: '在上面任一渠道找到公司官网后：Hunter 输入域名列出全部邮箱及职位；LinkedIn 找到人名后用 Apollo 反查邮箱。都有免费额度。',
        links: [
          { label: 'Hunter.io（按域名）', url: 'https://hunter.io/search' },
          { label: 'Apollo.io（按人名+公司）', url: 'https://app.apollo.io/' },
          { label: 'Snov.io', url: 'https://snov.io/email-finder' }
        ]
      }
    ];
  }

  function renderChannels(body) {
    var icp = App.data.icp;
    var kws = [];
    if (icp.industry) kws.push(icp.industry);
    icp.keywords.forEach(function (k) { if (kws.indexOf(k) < 0) kws.push(k); });
    if (!kws.length) kws = ['modular homes'];
    if (!state.chKw || kws.indexOf(state.chKw) < 0) state.chKw = kws[0];
    var countries = icp.countries.length ? icp.countries : ['美国'];
    if (!state.chCountry || countries.indexOf(state.chCountry) < 0) state.chCountry = countries[0];

    var channels = buildChannels(state.chKw, countryEn(state.chCountry));

    var acc = App.services.emailAccount.get();

    body.innerHTML =
      '<div class="notice">两种用法：① 点「一键全渠道获客」让 AI 扫描全部渠道并汇总成表，勾选后一键发开发信；' +
      '② 用下方渠道卡片手动搜索（已按 <b>行业/产品 + 目标国家</b> 拼好搜索词），找到后回「潜客发现」录入。</div>' +

      // 一键全渠道获客 + 发信邮箱
      '<div class="card">' +
      '<div class="row-between" style="flex-wrap:wrap;gap:10px">' +
      '<div>' +
      '<div class="bold">🚀 一键全渠道获客</div>' +
      '<div class="small muted mt8">按当前 ICP（' + App.esc(state.chKw || '') + ' × ' + App.esc((icp.countries || []).join('/')) + '）扫描下方全部渠道，结果汇总成一张表，由你决定录入或群发开发信。</div>' +
      '</div>' +
      '<div class="row" style="flex-wrap:wrap">' +
      '<button class="btn" id="ch-email-btn">' + (acc && acc.email
        ? '📮 <span class="text-ok">' + App.esc(acc.email) + '</span> · 管理'
        : '📮 登录发信邮箱') + '</button>' +
      '<button class="btn btn-primary" id="ch-harvest"' + (harvesting ? ' disabled' : '') + '>🚀 一键全渠道获客</button>' +
      '</div>' +
      '</div>' +
      '<div id="ch-progress"></div>' +
      '<div id="ch-results">' + (harvest ? harvestTableHtml() : '') + '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="row" style="flex-wrap:wrap">' +
      '<div class="field" style="flex:1;min-width:260px;margin-bottom:0"><label class="field-label">搜索关键词（来自 ICP，可去 ICP 页增删）</label>' +
      '<select class="select" id="ch-kw">' +
      kws.map(function (k) { return '<option value="' + App.esc(k) + '"' + (state.chKw === k ? ' selected' : '') + '>' + App.esc(k) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="field" style="width:200px;margin-bottom:0"><label class="field-label">目标国家/地区</label>' +
      '<select class="select" id="ch-country">' +
      countries.map(function (c) { return '<option value="' + App.esc(c) + '"' + (state.chCountry === c ? ' selected' : '') + '>' + App.esc(c) + '</option>'; }).join('') +
      '</select></div>' +
      '</div>' +
      '</div>' +

      '<div class="grid grid-2">' +
      channels.map(function (ch) {
        return '<div class="card mb0">' +
          '<div class="card-title"><span>' + ch.icon + ' ' + App.esc(ch.name) + ' ' + App.ui.badge(ch.tag, 'accent') + '</span></div>' +
          '<div class="small mb8"><b>找什么：</b>' + App.esc(ch.what) + '</div>' +
          '<div class="small muted mb12"><b>方式：</b>' + App.esc(ch.how) + '</div>' +
          '<div class="row" style="flex-wrap:wrap">' +
          ch.links.map(function (l) {
            return '<a class="btn btn-sm" href="' + App.esc(l.url) + '" target="_blank" rel="noopener">↗ ' + App.esc(l.label) + '</a>';
          }).join('') +
          '</div>' +
          '</div>';
      }).join('') +
      '</div>' +

      '<div class="small muted mt12">提示：链接在本地/服务器部署环境中点击即开；受限的在线预览沙箱可能拦截外部跳转。海关数据以美国（ImportYeti 免费）最全，欧洲部分国家不公开提单数据，可用 B2B 目录与展会名录补充。</div>';

    body.querySelector('#ch-kw').onchange = function () {
      state.chKw = this.value;
      renderChannels(body);
    };
    body.querySelector('#ch-country').onchange = function () {
      state.chCountry = this.value;
      renderChannels(body);
    };
    body.querySelector('#ch-email-btn').onclick = function () {
      emailConfigModal(function () { renderChannels(body); });
    };
    body.querySelector('#ch-harvest').onclick = function () { runHarvest(body); };
    if (harvest) bindHarvestEvents(body);
  }

  /* ---- 一键全渠道获客：逐渠道扫描动画 → 服务层取结果 → 汇总表 ---- */
  function runHarvest(body) {
    if (harvesting) return;
    harvesting = true;
    var btn = body.querySelector('#ch-harvest');
    if (btn) btn.disabled = true;
    var box = body.querySelector('#ch-progress');
    var channels = ['Google 搜索', 'Google 地图', 'LinkedIn', 'X（推特）', 'YouTube', 'Facebook', '海关数据', 'B2B 目录', '行业展会'];
    box.innerHTML = '<div class="ai-box mt12"><div class="row mb8" style="gap:8px"><span class="ai-tag">AI</span>' +
      '<span class="small bold">正在按 ICP 扫描全部获客渠道…</span></div>' +
      '<div id="ch-prog-list" class="small" style="line-height:2"></div></div>';
    var listEl = box.querySelector('#ch-prog-list');

    var i = 0;
    var lines = [];
    function step() {
      if (!document.contains(listEl)) { harvesting = false; return; } // 已切走页面
      if (i < channels.length) {
        var found = 1 + Math.floor(Math.random() * 2);
        lines.push('✓ ' + channels[i] + '：发现 ' + found + ' 家匹配公司');
        listEl.innerHTML = lines.map(function (l) { return '<div>' + App.esc(l) + '</div>'; }).join('') +
          (i < channels.length - 1 ? '<div class="muted">⏳ 正在扫描 ' + App.esc(channels[i + 1]) + '…</div>' : '');
        i++;
        setTimeout(step, 420);
        return;
      }
      // 全部渠道扫完 → 服务层取汇总结果（正式版为后端真实抓取）
      App.services.discoverProspects({
        keyword: state.chKw,
        countries: App.data.icp.countries
      }).then(function (results) {
        harvesting = false;
        harvest = results;
        harvestSel = {};
        results.forEach(function (r, idx) { if (r.email) harvestSel[idx] = true; }); // 默认勾选有邮箱的
        if (!document.contains(box)) return;
        box.innerHTML = '';
        var resBox = body.querySelector('#ch-results');
        resBox.innerHTML = harvestTableHtml();
        bindHarvestEvents(body);
        var b2 = body.querySelector('#ch-harvest');
        if (b2) b2.disabled = false;
        App.ui.toast('全渠道扫描完成，共发现 ' + results.length + ' 家潜在客户', 'ok');
      });
    }
    step();
  }

  function harvestTableHtml() {
    var selCount = 0, selMail = 0;
    harvest.forEach(function (r, i) {
      if (harvestSel[i]) { selCount++; if (r.email) selMail++; }
    });
    return '<div class="row-between mt12 mb8" style="flex-wrap:wrap;gap:8px">' +
      '<span class="bold">全渠道获客结果 <span class="small muted">共 ' + harvest.length + ' 家 · 已选 ' + selCount + ' · 选中含邮箱 ' + selMail + '</span></span>' +
      '<span class="row" style="flex-wrap:wrap">' +
      '<button class="btn btn-sm" id="ch-sel-all">全选 / 清空</button>' +
      '<button class="btn btn-sm" id="ch-import">📥 录入选中潜客</button>' +
      '<button class="btn btn-sm btn-primary" id="ch-send">✉️ 一键发送开发信（' + selMail + '）</button>' +
      '</span></div>' +
      '<div style="overflow-x:auto"><table class="tbl"><thead><tr>' +
      '<th style="width:34px"></th><th>公司</th><th>渠道</th><th>国家</th><th>联系人</th><th>邮箱</th><th style="width:70px">AI 评分</th><th>状态</th>' +
      '</tr></thead><tbody>' +
      harvest.map(function (r, i) {
        var status = r.sent ? App.ui.badge('已发开发信', 'ok')
          : r.added ? App.ui.badge('已录入', 'accent')
            : '<span class="muted small">-</span>';
        return '<tr>' +
          '<td><input type="checkbox" data-hi="' + i + '"' + (harvestSel[i] ? ' checked' : '') + (r.sent ? ' disabled' : '') + ' style="accent-color:var(--accent)"></td>' +
          '<td><b>' + App.esc(r.company) + '</b><div class="small muted">' + App.esc(r.website) + '</div></td>' +
          '<td>' + App.ui.badge(r.channel, 'info') + '</td>' +
          '<td>' + App.esc(r.country) + '</td>' +
          '<td>' + App.esc(r.person) + '<div class="small muted">' + App.esc(r.role) + '</div></td>' +
          '<td>' + (r.email ? '<span class="small">' + App.esc(r.email) + '</span>'
            : '<span class="small text-warn">待补（用 Hunter 查）</span>') + '</td>' +
          '<td><b class="text-' + scoreCls(r.score) + '">' + r.score + '</b></td>' +
          '<td>' + status + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<div class="small muted mt8">演示数据由 AI 模拟生成；部署服务器接入抓取 API 后，这里就是真实公司。勾选后可先「录入」再逐个跟进，或直接「一键发送开发信」（用触达序列 D0 话术，自动替换公司/人名）。</div>';
  }

  function bindHarvestEvents(body) {
    var resBox = body.querySelector('#ch-results');
    if (!resBox || !harvest) return;

    function refresh() {
      resBox.innerHTML = harvestTableHtml();
      bindHarvestEvents(body);
    }

    resBox.querySelectorAll('input[data-hi]').forEach(function (cb) {
      cb.onchange = function () {
        harvestSel[parseInt(cb.getAttribute('data-hi'), 10)] = cb.checked;
        refresh();
      };
    });

    var selAll = resBox.querySelector('#ch-sel-all');
    if (selAll) selAll.onclick = function () {
      var any = Object.keys(harvestSel).some(function (k) { return harvestSel[k]; });
      harvestSel = {};
      if (!any) harvest.forEach(function (r, i) { if (!r.sent) harvestSel[i] = true; });
      refresh();
    };

    // 录入选中 → 潜客名单
    var importBtn = resBox.querySelector('#ch-import');
    if (importBtn) importBtn.onclick = function () {
      var items = harvest.filter(function (r, i) { return harvestSel[i] && !r.added; });
      if (!items.length) { App.ui.toast('请先勾选要录入的公司（未录入过的）'); return; }
      items.forEach(function (r) { addHarvestProspect(r, '待触达', '-'); });
      App.persist();
      refresh();
      App.ui.toast('已录入 ' + items.length + ' 家到「潜客发现」', 'ok');
    };

    // 一键发送开发信
    var sendBtn = resBox.querySelector('#ch-send');
    if (sendBtn) sendBtn.onclick = function () {
      var items = harvest.filter(function (r, i) { return harvestSel[i] && r.email && !r.sent; });
      if (!items.length) { App.ui.toast('选中的公司里没有可发送的邮箱（已发过的不重复发）', 'bad'); return; }
      var acc = App.services.emailAccount.get();
      if (!acc || !acc.email) {
        App.ui.toast('请先登录发信邮箱', 'bad');
        emailConfigModal(function () { renderChannels(body); });
        return;
      }
      sendOutreachModal(items, acc, body);
    };
  }

  function addHarvestProspect(r, status, lastAction) {
    App.data.prospects.unshift({
      id: 'ph' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      company: r.company, country: r.country, person: r.person, role: r.role,
      website: r.website, email: r.email, source: r.channel,
      score: r.score, signals: r.signals,
      status: status, lastAction: lastAction
    });
    r.added = true;
  }

  /* ---- 一键发送开发信：确认弹窗 → 服务层发送 ---- */
  function sendOutreachModal(items, acc, body) {
    var d0 = App.data.outreachSequences[0];
    var names = items.slice(0, 5).map(function (r) { return r.company; }).join('、') +
      (items.length > 5 ? ' 等 ' + items.length + ' 家' : '');

    App.ui.modal('一键发送开发信',
      '<dl class="kv">' +
      '<dt>发件邮箱</dt><dd><b>' + App.esc(acc.email) + '</b>（' + App.esc(acc.name || '未设发件人名') + '）</dd>' +
      '<dt>收件对象</dt><dd>' + App.esc(names) + '，共 <b>' + items.length + '</b> 封</dd>' +
      '<dt>使用话术</dt><dd>触达序列 D0（可在「触达序列」页签修改）</dd>' +
      '</dl>' +
      '<div class="field-label mt12">邮件预览（发送时 {name}/{company}/{country} 自动替换为每家的真实信息）</div>' +
      '<div class="ai-box"><div class="bold mb8">' + hl(d0.subject) + '</div>' +
      '<div class="small" style="white-space:pre-wrap;line-height:1.7">' + hl(d0.body) + '</div></div>' +
      '<div class="notice mt12">发送后这些公司自动录入「潜客发现」并进入触达序列（D3/D7/D14 自动跟进，对方回复即停）。' +
      '当前为演示模式，不会真实发出；部署后由服务器通过你的邮箱 SMTP 真实发送。</div>' +
      '<div id="send-progress"></div>',
      '<button class="btn" id="send-cancel">取消</button>' +
      '<button class="btn btn-primary" id="send-ok">确认发送 ' + items.length + ' 封</button>');

    document.getElementById('send-cancel').onclick = App.ui.closeModal;
    document.getElementById('send-ok').onclick = function () {
      var okBtn = this;
      okBtn.disabled = true;
      var box = document.getElementById('send-progress');
      var stop = App.ai.thinking(box, '正在通过 ' + acc.email + ' 逐封发送（自动替换个性化字段）…');
      App.services.sendOutreach(acc, items, d0).then(function (res) {
        stop();
        items.forEach(function (r) {
          if (r.added) {
            // 已录入过的直接更新状态
            for (var i = 0; i < App.data.prospects.length; i++) {
              var p = App.data.prospects[i];
              if (p.company === r.company && p.website === r.website) {
                p.status = '已发邮件';
                p.lastAction = 'D0 开发信已发送（批量）';
                break;
              }
            }
          } else {
            addHarvestProspect(r, '已发邮件', 'D0 开发信已发送（批量）');
          }
          r.sent = true;
        });
        App.persist();
        App.ui.closeModal();
        var bodyEl = document.getElementById('pros-body');
        if (bodyEl && state.tab === 'channels') renderChannels(bodyEl);
        App.ui.toast('已发送 ' + res.sent + ' 封开发信（演示模式），对应公司已进入触达序列', 'ok');
      });
    };
  }

  /* ---- 发信邮箱：登录 / 编辑 / 退出 ---- */
  var SMTP_PRESETS = {
    'Gmail': { host: 'smtp.gmail.com', port: 465 },
    'Outlook': { host: 'smtp.office365.com', port: 587 },
    'QQ 邮箱': { host: 'smtp.qq.com', port: 465 },
    '163 邮箱': { host: 'smtp.163.com', port: 465 },
    '阿里企业邮': { host: 'smtp.qiye.aliyun.com', port: 465 },
    '腾讯企业邮': { host: 'smtp.exmail.qq.com', port: 465 },
    '自定义 SMTP': { host: '', port: 465 }
  };

  function emailConfigModal(onSaved) {
    var acc = App.services.emailAccount.get() || { name: '', email: '', provider: 'Gmail', host: SMTP_PRESETS['Gmail'].host, port: SMTP_PRESETS['Gmail'].port, auth: '' };

    App.ui.modal('登录发信邮箱',
      '<div class="notice mb12">开发信将通过这个邮箱发出。企业邮箱送达率最好；Gmail/QQ 等需要在邮箱设置里开启 SMTP 并生成「授权码」。' +
      '当前为演示模式，配置仅保存在本浏览器；部署后密码只保存在服务器端。</div>' +
      '<div class="row">' +
      '<div class="field" style="flex:1"><label class="field-label">发件人名称</label>' +
      '<input class="input" id="em-name" placeholder="例如：Kevin - Oasis Modular" value="' + App.esc(acc.name) + '"></div>' +
      '<div class="field" style="flex:1"><label class="field-label">邮箱地址 *</label>' +
      '<input class="input" id="em-email" placeholder="例如：kevin@oasismodular.com" value="' + App.esc(acc.email) + '"></div>' +
      '</div>' +
      '<div class="row">' +
      '<div class="field" style="flex:1"><label class="field-label">服务商</label>' +
      '<select class="select" id="em-provider">' +
      Object.keys(SMTP_PRESETS).map(function (p) {
        return '<option' + (acc.provider === p ? ' selected' : '') + '>' + p + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="field" style="flex:2"><label class="field-label">SMTP 服务器</label>' +
      '<input class="input" id="em-host" value="' + App.esc(acc.host) + '"></div>' +
      '<div class="field" style="width:90px"><label class="field-label">端口</label>' +
      '<input class="input" id="em-port" type="number" value="' + App.esc(acc.port) + '"></div>' +
      '</div>' +
      '<div class="field"><label class="field-label">密码 / 授权码</label>' +
      '<input class="input" id="em-auth" type="password" placeholder="邮箱 SMTP 授权码" value="' + App.esc(acc.auth) + '"></div>',
      '<button class="btn" id="em-cancel">取消</button>' +
      (App.services.emailAccount.get() ? '<button class="btn btn-danger" id="em-logout">退出登录</button>' : '') +
      '<button class="btn btn-primary" id="em-save">保存并登录</button>');

    document.getElementById('em-provider').onchange = function () {
      var p = SMTP_PRESETS[this.value];
      if (p) {
        document.getElementById('em-host').value = p.host;
        document.getElementById('em-port').value = p.port;
      }
    };
    document.getElementById('em-cancel').onclick = App.ui.closeModal;
    var logoutBtn = document.getElementById('em-logout');
    if (logoutBtn) logoutBtn.onclick = function () {
      App.services.emailAccount.clear();
      App.ui.closeModal();
      App.ui.toast('已退出发信邮箱');
      if (onSaved) onSaved();
    };
    document.getElementById('em-save').onclick = function () {
      var email = document.getElementById('em-email').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) { App.ui.toast('请填写正确的邮箱地址', 'bad'); return; }
      var ok = App.services.emailAccount.save({
        name: document.getElementById('em-name').value.trim(),
        email: email,
        provider: document.getElementById('em-provider').value,
        host: document.getElementById('em-host').value.trim(),
        port: parseInt(document.getElementById('em-port').value, 10) || 465,
        auth: document.getElementById('em-auth').value
      });
      App.ui.closeModal();
      App.ui.toast(ok ? '已登录发信邮箱 ' + email : '保存失败：浏览器存储不可用', ok ? 'ok' : 'bad');
      if (onSaved) onSaved();
    };
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
      '<span class="row">' +
      '<button class="btn btn-sm" id="pros-add">＋ 手动录入潜客</button>' +
      '<button class="btn btn-primary btn-sm" id="pros-fetch">🌍 AI 抓取新一批潜客</button>' +
      '</span></div>' +
      '<div class="small muted mb8">在「获客渠道」找到的公司和邮箱，点「手动录入潜客」记进来，再加入触达序列自动发开发信。</div>' +
      '<div id="pros-fetch-think"></div>' +
      App.ui.table(cols, list, {
        emptyMsg: '暂无潜客，点击右上角开始抓取',
        rowAttr: function (r) { return 'class="clickable" data-pid="' + App.esc(r.id) + '"'; }
      }) +
      '<div class="small muted mt8">点击任意一行查看公司全量信息与 AI 判定理由。</div>' +
      '</div>';

    // 事件：手动录入潜客
    body.querySelector('#pros-add').onclick = function () { addProspectModal(body); };

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

  /* ---- 手动录入潜客（配合「获客渠道」使用） ---- */
  function addProspectModal(listBody) {
    var icp = App.data.icp;
    var sources = ['Google 搜索', 'Google 地图', 'LinkedIn', 'X（推特）', 'YouTube', 'Facebook', '海关数据', 'B2B 目录', '行业展会', '其他'];
    App.ui.modal('手动录入潜客',
      '<div class="notice mb12">把「获客渠道」里找到的公司信息记进来。带 * 为必填。</div>' +
      '<div class="row">' +
      '<div class="field" style="flex:1"><label class="field-label">公司名 *</label>' +
      '<input class="input" id="pa-company" placeholder="例如：Lakeside Cabins LLC"></div>' +
      '<div class="field" style="flex:1"><label class="field-label">官网</label>' +
      '<input class="input" id="pa-website" placeholder="例如：lakesidecabins.com"></div>' +
      '</div>' +
      '<div class="row">' +
      '<div class="field" style="flex:1"><label class="field-label">国家/地区 *</label>' +
      '<select class="select" id="pa-country">' +
      icp.countries.map(function (c) { return '<option>' + App.esc(c) + '</option>'; }).join('') +
      '<option value="__other">其他…</option>' +
      '</select>' +
      '<input class="input mt8" id="pa-country-other" placeholder="输入国家/地区" style="display:none">' +
      '</div>' +
      '<div class="field" style="flex:1"><label class="field-label">来源渠道</label>' +
      '<select class="select" id="pa-source">' +
      sources.map(function (s) { return '<option>' + App.esc(s) + '</option>'; }).join('') +
      '</select></div>' +
      '</div>' +
      '<div class="row">' +
      '<div class="field" style="flex:1"><label class="field-label">联系人</label>' +
      '<input class="input" id="pa-person" placeholder="例如：John Smith"></div>' +
      '<div class="field" style="flex:1"><label class="field-label">职位</label>' +
      '<select class="select" id="pa-role">' +
      icp.roles.map(function (r) { return '<option>' + App.esc(r) + '</option>'; }).join('') +
      '<option>其他</option>' +
      '</select></div>' +
      '</div>' +
      '<div class="field"><label class="field-label">邮箱（发开发信用，官网 Contact 页或 Hunter.io 可查）</label>' +
      '<input class="input" id="pa-email" placeholder="例如：john@lakesidecabins.com"></div>' +
      '<div class="field"><label class="field-label">信号/备注（用逗号分隔，将参与 AI 评分展示）</label>' +
      '<input class="input" id="pa-signals" placeholder="例如：官网有扩建计划, 海关数据有进口记录"></div>',
      '<button class="btn" id="pa-cancel">取消</button>' +
      '<button class="btn btn-primary" id="pa-save">录入潜客</button>');

    var countrySel = document.getElementById('pa-country');
    countrySel.onchange = function () {
      document.getElementById('pa-country-other').style.display = countrySel.value === '__other' ? '' : 'none';
    };
    document.getElementById('pa-cancel').onclick = App.ui.closeModal;
    document.getElementById('pa-save').onclick = function () {
      var company = document.getElementById('pa-company').value.trim();
      if (!company) { App.ui.toast('请填写公司名', 'bad'); return; }
      var country = countrySel.value === '__other'
        ? document.getElementById('pa-country-other').value.trim()
        : countrySel.value;
      if (!country) { App.ui.toast('请填写国家/地区', 'bad'); return; }
      var role = document.getElementById('pa-role').value;
      var signals = document.getElementById('pa-signals').value
        .split(/[，,]/).map(function (s) { return s.trim(); }).filter(Boolean);
      var email = document.getElementById('pa-email').value.trim();

      // 简易评分：目标市场 +20，决策角色 +20，有信号 +10，有邮箱 +10，基础 40
      var score = 40;
      if (App.data.icp.countries.indexOf(country) >= 0) score += 20;
      if (App.data.icp.roles.indexOf(role) >= 0) score += 20;
      if (signals.length) score += 10;
      if (email) score += 10;

      App.data.prospects.unshift({
        id: 'pm' + Date.now(),
        company: company,
        country: country,
        person: document.getElementById('pa-person').value.trim() || '待补充',
        role: role,
        website: document.getElementById('pa-website').value.trim() || '-',
        email: email,
        source: document.getElementById('pa-source').value,
        score: Math.min(score, 95),
        signals: signals.length ? signals : ['手动录入'],
        status: '待触达',
        lastAction: '-'
      });
      App.persist();
      App.ui.closeModal();
      App.ui.toast('已录入「' + company + '」，可在列表点开加入触达序列', 'ok');
      if (state.tab === 'discover') renderDiscover(listBody);
    };
  }

  function openProspectModal(p) {
    var kv =
      '<dl class="kv">' +
      '<dt>公司</dt><dd><b>' + App.esc(p.company) + '</b></dd>' +
      '<dt>官网</dt><dd>' + App.esc(p.website) + '</dd>' +
      '<dt>国家</dt><dd>' + App.esc(p.country) + '</dd>' +
      '<dt>联系人</dt><dd>' + App.esc(p.person) + ' ' + App.ui.badge(p.role, 'info') + '</dd>' +
      '<dt>邮箱</dt><dd>' + (p.email ? App.esc(p.email) : '<span class="muted">待补充（官网 Contact 页 / Hunter.io 可查）</span>') + '</dd>' +
      (p.source ? '<dt>来源渠道</dt><dd>' + App.esc(p.source) + '</dd>' : '') +
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
        App.persist();
        App.ui.closeModal();
        App.ui.toast(p.email
          ? '已进入 D0 邮件序列，将发送至 ' + p.email + '（演示环境不真实发送）'
          : '已进入 D0 邮件序列（该潜客暂无邮箱，正式版会先自动补全邮箱）');
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
        App.persist();

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
