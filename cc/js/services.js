/* ============ 服务层：所有对外部系统的调用统一走这里 ============
 * 目的：页面模块只调用 App.services.xxx，不关心背后是演示模拟还是真实服务。
 * 当前为【演示实现】（本地模拟数据 + localStorage 存配置）。
 * 部署到服务器后，把下面每个函数体替换为 fetch('/api/...') 调用后端即可，
 * 页面代码无需改动。需要后端配合的点已在各函数注释中标明。
 */
(function () {
  'use strict';
  var S = {};

  /* ================================================================
   * 一、发信邮箱账号
   * 演示：配置保存在本浏览器 localStorage。
   * 正式版：POST /api/email-account 保存到服务器（密码/授权码只存服务器端），
   *         发送时由服务器用 SMTP 连接该邮箱发出。
   * ================================================================ */
  var EMAIL_KEY = 'email_account_v1';
  S.emailAccount = {
    get: function () {
      try { return JSON.parse(localStorage.getItem(EMAIL_KEY) || 'null'); } catch (e) { return null; }
    },
    save: function (acc) {
      try { localStorage.setItem(EMAIL_KEY, JSON.stringify(acc)); return true; } catch (e) { return false; }
    },
    clear: function () {
      try { localStorage.removeItem(EMAIL_KEY); } catch (e) {}
    }
  };

  /* ================================================================
   * 二、全渠道获客
   * 演示：按 关键词+目标国家 本地生成拟真结果。
   * 正式版：POST /api/discover {keyword, countries, channels}
   *         后端对接 Google/地图/LinkedIn/海关数据等抓取服务，返回同样结构。
   * 返回：[{channel, company, website, country, person, role, email, signals[], score}]
   * ================================================================ */
  var GEO_WORDS = ['Alpine', 'Coastal', 'Sunrise', 'Northern', 'Blue Lake', 'Green Valley', 'Summit', 'Harbor', 'Prairie', 'Riverside', 'Golden', 'Evergreen'];
  var FIRST_NAMES = ['James', 'Sarah', 'Mike', 'Emma', 'Lucas', 'Olivia', 'Daniel', 'Sophie', 'Tom', 'Nina', 'Carlos', 'Anna', 'Erik', 'Laura'];
  var LAST_NAMES = ['Miller', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Weber', 'Larsen', 'Costa', 'Novak', 'Schmidt'];
  var TLD = { '美国': '.com', '加拿大': '.ca', '澳大利亚': '.com.au', '新西兰': '.co.nz', '德国': '.de', '法国': '.fr', '英国': '.co.uk', '瑞典': '.se', '阿联酋': '.ae', '沙特': '.sa', '墨西哥': '.mx', '越南': '.vn' };
  var CHANNEL_MOCK = [
    { channel: 'Google 搜索', per: 2, suffixes: ['Trading', 'Supply Co', 'Distributors'], signal: '官网在售同类产品', roleBias: 'Purchasing Manager' },
    { channel: 'Google 地图', per: 2, suffixes: ['Resorts', 'Campgrounds', 'Retreats'], signal: '实体营地/度假村，资料页有电话', roleBias: 'Owner / Founder' },
    { channel: 'LinkedIn', per: 2, suffixes: ['Group', 'Holdings', 'Projects'], signal: 'LinkedIn 近90天活跃', roleBias: 'Director' },
    { channel: 'X（推特）', per: 1, suffixes: ['Ventures', 'Outdoors', 'Stays'], signal: '近期发帖询问同类产品', roleBias: 'Owner / Founder' },
    { channel: 'YouTube', per: 1, suffixes: ['Builds', 'Living', 'Media'], signal: '频道有相关测评/搭建视频', roleBias: 'Owner / Founder' },
    { channel: 'Facebook', per: 1, suffixes: ['Rentals', 'Escapes', 'Camps'], signal: '行业群组活跃成员', roleBias: 'Owner / Founder' },
    { channel: '海关数据', per: 2, suffixes: ['Imports', 'Housing', 'Logistics'], signal: '近12个月有同类进口提单', roleBias: 'Purchasing Manager' },
    { channel: 'B2B 目录', per: 1, suffixes: ['Ltd', 'LLC', 'GmbH'], signal: 'Europages/Kompass 收录企业', roleBias: 'Purchasing Manager' },
    { channel: '行业展会', per: 1, suffixes: ['Developments', 'Constructions', 'Exhibits'], signal: '上届行业展展商', roleBias: 'Project Manager' }
  ];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  S.discoverProspects = function (opts) {
    var kw = (opts.keyword || 'product').split(/[\/(（]/)[0].trim();       // 取关键词第一段
    var kwCap = kw.split(' ').slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
    var countries = (opts.countries && opts.countries.length) ? opts.countries : ['美国'];
    var usedNames = {};
    var results = [];

    CHANNEL_MOCK.forEach(function (cm) {
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
    return new Promise(function (res) {
      setTimeout(function () {
        res({ sent: recipients.length, failed: 0, mode: 'demo' });
      }, 1400);
    });
  };

  App.services = S;
})();
