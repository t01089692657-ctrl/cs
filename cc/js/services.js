/* ============ 服务层：所有对外部系统的调用统一走这里 ============
 * 目的：页面模块只调用 App.services.xxx，不关心背后是演示模拟还是真实服务。
 * 当前为【演示实现】（本地模拟数据 + localStorage 存配置）。
 * 部署到服务器后，把下面每个函数体替换为 fetch('/api/...') 调用后端即可，
 * 页面代码无需改动。需要后端配合的点已在各函数注释中标明。
 */
(function () {
  'use strict';
  var S = {};

  function live() { return window.App && App.isLive && App.isLive(); }

  // 在线模式下预载服务端配置到缓存，供同步 UI 读取（app.js 启动时调用）
  var cache = { emailAccount: null, engine: null };
  S._preload = function () {
    if (!live()) return Promise.resolve();
    return Promise.all([
      App.api.get('/api/outreach/account').then(function (a) { cache.emailAccount = a; }).catch(function () {}),
      App.api.get('/api/engine').then(function (e) { cache.engine = e; }).catch(function () {})
    ]);
  };

  /* ================================================================
   * 一、发信邮箱账号
   * 演示：localStorage。在线：服务器（授权码只存服务器端，不回传前端）。
   * ================================================================ */
  var EMAIL_KEY = 'email_account_v1';
  S.emailAccount = {
    get: function () {
      if (live()) return cache.emailAccount;
      try { return JSON.parse(localStorage.getItem(EMAIL_KEY) || 'null'); } catch (e) { return null; }
    },
    save: function (acc) {
      if (live()) {
        // 乐观更新缓存（不含授权码），后台 PUT 到服务器
        cache.emailAccount = { name: acc.name, email: acc.email, host: acc.host, port: acc.port, configured: !!acc.auth };
        App.api.put('/api/outreach/account', acc).catch(function (e) { App.ui.toast('保存邮箱失败：' + e.message, 'bad'); });
        return true;
      }
      try { localStorage.setItem(EMAIL_KEY, JSON.stringify(acc)); return true; } catch (e) { return false; }
    },
    clear: function () {
      if (live()) { cache.emailAccount = null; return; }
      try { localStorage.removeItem(EMAIL_KEY); } catch (e) {}
    }
  };

  /* ================================================================
   * 二、获客引擎配置
   * 演示：localStorage（可在前端填 key）。
   * 在线：引擎 key 来自服务器 .env，前端只读状态；模式切换存服务器（10 人共享）。
   * ================================================================ */
  var ENGINE_KEY = 'prospecting_engine_v1';
  var MODE_KEY = 'prospecting_mode_v1';
  S.engine = {
    // 在线模式返回 null（引擎在服务器配置，前端不编辑）
    get: function () {
      if (live()) return null;
      try { return JSON.parse(localStorage.getItem(ENGINE_KEY) || 'null'); } catch (e) { return null; }
    },
    save: function (cfg) {
      if (live()) return false; // 在线模式引擎在服务器 .env 配置
      try { localStorage.setItem(ENGINE_KEY, JSON.stringify(cfg)); return true; } catch (e) { return false; }
    },
    clear: function () { if (live()) return; try { localStorage.removeItem(ENGINE_KEY); } catch (e) {} },
    ready: function () {
      if (live()) return !!(cache.engine && cache.engine.ready);
      var c = S.engine.get();
      return !!(c && c.llmKey && (c.firecrawlKey || c.crawl4aiUrl));
    },
    // 在线模式返回服务端各能力配置状态（供只读展示）
    status: function () { return live() ? (cache.engine && cache.engine.configured) || null : null; },
    getMode: function () {
      if (live()) return (cache.engine && cache.engine.mode) || 'compliant';
      try { return localStorage.getItem(MODE_KEY) || 'compliant'; } catch (e) { return 'compliant'; }
    },
    setMode: function (m) {
      if (live()) {
        if (cache.engine) cache.engine.mode = m;
        App.api.put('/api/engine/mode', { mode: m }).catch(function (e) { App.ui.toast('切换模式失败：' + e.message, 'bad'); });
        return;
      }
      try { localStorage.setItem(MODE_KEY, m); } catch (e) {}
    }
  };

  /* 各渠道：compliant=合规 API 源（默认就跑）；社媒抓取仅「全网模式」启用 */
  S.CHANNELS = [
    { name: 'Google 搜索', compliant: true },
    { name: 'Google 地图', compliant: true },
    { name: '海关数据', compliant: true },
    { name: 'B2B 目录', compliant: true },
    { name: '行业展会', compliant: true },
    { name: 'LinkedIn', compliant: false },
    { name: 'X（推特）', compliant: false },
    { name: 'YouTube', compliant: false },
    { name: 'Facebook', compliant: false }
  ];
  S.channelsForMode = function (mode) {
    return S.CHANNELS.filter(function (c) { return mode === 'full' || c.compliant; })
      .map(function (c) { return c.name; });
  };

  /* ================================================================
   * 三、全渠道获客
   * 演示：按 关键词+目标国家+模式 本地生成拟真结果。
   * 正式版：POST /api/discover {keyword, countries, mode}
   *         后端「获客 agent」按模式选择数据源抓取，返回同样结构。
   * 返回：[{channel, company, website, country, person, role, email, signals[], score}]
   * ================================================================ */
  var GEO_WORDS = ['Alpine', 'Coastal', 'Sunrise', 'Northern', 'Blue Lake', 'Green Valley', 'Summit', 'Harbor', 'Prairie', 'Riverside', 'Golden', 'Evergreen'];
  var FIRST_NAMES = ['James', 'Sarah', 'Mike', 'Emma', 'Lucas', 'Olivia', 'Daniel', 'Sophie', 'Tom', 'Nina', 'Carlos', 'Anna', 'Erik', 'Laura'];
  var LAST_NAMES = ['Miller', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Weber', 'Larsen', 'Costa', 'Novak', 'Schmidt'];
  var TLD = { '美国': '.com', '加拿大': '.ca', '澳大利亚': '.com.au', '新西兰': '.co.nz', '德国': '.de', '法国': '.fr', '英国': '.co.uk', '瑞典': '.se', '阿联酋': '.ae', '沙特': '.sa', '墨西哥': '.mx', '越南': '.vn' };
  var CHANNEL_MOCK = [
    { channel: 'Google 搜索', compliant: true, per: 2, suffixes: ['Trading', 'Supply Co', 'Distributors'], signal: '官网在售同类产品', roleBias: 'Purchasing Manager' },
    { channel: 'Google 地图', compliant: true, per: 2, suffixes: ['Resorts', 'Campgrounds', 'Retreats'], signal: '实体营地/度假村，资料页有电话', roleBias: 'Owner / Founder' },
    { channel: '海关数据', compliant: true, per: 2, suffixes: ['Imports', 'Housing', 'Logistics'], signal: '近12个月有同类进口提单', roleBias: 'Purchasing Manager' },
    { channel: 'B2B 目录', compliant: true, per: 1, suffixes: ['Ltd', 'LLC', 'GmbH'], signal: 'Europages/Kompass 收录企业', roleBias: 'Purchasing Manager' },
    { channel: '行业展会', compliant: true, per: 1, suffixes: ['Developments', 'Constructions', 'Exhibits'], signal: '上届行业展展商', roleBias: 'Project Manager' },
    { channel: 'LinkedIn', compliant: false, per: 2, suffixes: ['Group', 'Holdings', 'Projects'], signal: 'LinkedIn 近90天活跃', roleBias: 'Director' },
    { channel: 'X（推特）', compliant: false, per: 1, suffixes: ['Ventures', 'Outdoors', 'Stays'], signal: '近期发帖询问同类产品', roleBias: 'Owner / Founder' },
    { channel: 'YouTube', compliant: false, per: 1, suffixes: ['Builds', 'Living', 'Media'], signal: '频道有相关测评/搭建视频', roleBias: 'Owner / Founder' },
    { channel: 'Facebook', compliant: false, per: 1, suffixes: ['Rentals', 'Escapes', 'Camps'], signal: '行业群组活跃成员', roleBias: 'Owner / Founder' }
  ];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  S.discoverProspects = function (opts) {
    // 在线模式：调服务器获客 agent（真实抓取或服务端演示）
    if (live()) {
      return App.api.post('/api/discover', {
        keyword: opts.keyword, countries: opts.countries, mode: opts.mode || 'compliant'
      }).then(function (d) { return (d && d.results) || []; });
    }
    var kw = (opts.keyword || 'product').split(/[\/(（]/)[0].trim();       // 取关键词第一段
    var kwCap = kw.split(' ').slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
    var countries = (opts.countries && opts.countries.length) ? opts.countries : ['美国'];
    var mode = opts.mode || 'compliant';
    var usedNames = {};
    var results = [];

    CHANNEL_MOCK.filter(function (cm) { return mode === 'full' || cm.compliant; }).forEach(function (cm) {
      for (var i = 0; i < cm.per; i++) {
        var geo = pick(GEO_WORDS);
        var name = geo + ' ' + kwCap + ' ' + pick(cm.suffixes);
        if (usedNames[name]) name = pick(GEO_WORDS) + ' ' + kwCap + ' ' + pick(cm.suffixes);
        if (usedNames[name]) continue;
        usedNames[name] = true;

        var country = pick(countries);
        var domain = name.toLowerCase().replace(/[^a-z0-9]+/g, '') + (TLD[country] || '.com');
        var person = pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES);
        var role = Math.random() < 0.6 ? cm.roleBias : pick(['Owner / Founder', 'Purchasing Manager', 'Project Manager', 'Director']);
        // 约 7 成能直接拿到邮箱，其余标记待补（引导用找邮箱工具）
        var email = Math.random() < 0.7
          ? (Math.random() < 0.5 ? 'info@' + domain : person.split(' ')[0].toLowerCase() + '@' + domain)
          : '';

        var score = 55 + Math.floor(Math.random() * 30);
        if (cm.channel === '海关数据') score += 8;               // 有真实进口记录，最准
        if (/Owner|Purchasing/.test(role)) score += 4;
        if (email) score += 3;
        score = Math.min(score, 96);

        results.push({
          channel: cm.channel,
          company: name,
          website: domain,
          country: country,
          person: person,
          role: role,
          email: email,
          signals: [cm.signal, '来源: ' + cm.channel],
          score: score
        });
      }
    });

    results.sort(function (a, b) { return b.score - a.score; });
    // 模拟网络耗时；正式版换成 fetch('/api/discover') 即可
    return new Promise(function (res) {
      setTimeout(function () { res(results); }, 600);
    });
  };

  /* ================================================================
   * 三、批量发送开发信
   * 演示：模拟发送，不真实发出。
   * 正式版：POST /api/outreach/send {accountId, prospectIds, templateId}
   *         后端用已登录邮箱 SMTP 逐封发送（自动替换 {name}/{company}/{country}），
   *         控制发送频率与退订合规，返回 {sent, failed, details}。
   * ================================================================ */
  S.sendOutreach = function (account, recipients, template) {
    if (live()) {
      return App.api.post('/api/outreach/send', { recipients: recipients, template: template });
    }
    return new Promise(function (res) {
      setTimeout(function () {
        res({ sent: recipients.length, failed: 0, mode: 'demo' });
      }, 1400);
    });
  };

  App.services = S;
})();
