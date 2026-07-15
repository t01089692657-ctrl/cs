/* ============ 模块：WhatsApp 工作台（旗舰模块） ============
 * 三栏布局：会话列表 | 聊天窗口 | 客户卡+销冠辅助+工具
 * 遵循 dashboard.js 编码约定：IIFE / App.registerModule / 事件绑定在 innerHTML 之后
 * 私有样式选择器一律以 .mod-whatsapp 开头
 */
(function () {
  'use strict';

  /* ---------- 私有：客户消息中文翻译（键 = core-data.js 中原文全文） ---------- */
  var TRANSLATIONS = {};
  [
    // c1 Mike Johnson（美国 · 营地）
    ['Hi, saw your expandable house video on Facebook. How much for one unit?',
      '你好，在 Facebook 上看到你们的可扩展房屋视频。一套多少钱？'],
    ['Glamping site in Texas. Thinking 8-10 units to start.',
      '是德州的豪华露营营地，起步打算做 8-10 套。'],
    ['Yes please. Also saw cheaper ones online around $6,500, what is the difference?',
      '好的麻烦了。另外我在网上看到 $6,500 左右的便宜款，区别在哪？'],
    ['Got the files. The ROI sheet is interesting. What about delivery time to Houston?',
      '文件收到了，那份 ROI 回本测算表挺有意思。到休斯顿的交期是多久？'],
    ['Let me discuss with my partner this weekend. The $9,800 is still above what we planned.',
      '这周末我和合伙人商量一下。$9,800 还是超出了我们原本的预算。'],
    // c2 Ahmed Al-Rashidi（阿联酋 · 工程承包商）
    ['We are evaluating suppliers for a 40-unit desert camp project in Dubai. Send company profile and project references.',
      '我们正在为迪拜一个 40 套的沙漠营地项目评估供应商。请发送公司简介和项目案例。'],
    ['Camp must open before December. Heat resistance is critical, 45°C summers.',
      '营地必须在 12 月前开业。耐热性能是关键，夏季高达 45°C。'],
    ['Good. Our team will visit factories in China next month. Add us to your schedule.',
      '好。我们团队下个月去中国考察工厂，把我们排进你们的接待日程。'],
    ['July 15-16. Send the BOQ draft before July 10.',
      '7 月 15-16 日。7 月 10 日前把 BOQ（工程量清单）草案发给我。'],
    // c5 Olu Adeyemi（尼日利亚 · 经销商）
    ['Your price is too high my friend. I can get same house $5,000 from another factory.',
      '朋友，你们的价格太高了。同样的房子我在别的工厂 $5,000 就能拿到。'],
    ['FD-13 interesting. Send catalog. But best price please, Lagos market is very price sensitive.',
      'FD-13 有点意思，把产品目录发来。但请给最优价，拉各斯市场对价格非常敏感。'],
    ['I will start with 5 units only. Give me $2,800 and we do business long time.',
      '我先只订 5 套。给我 $2,800 的价格，我们以后长期合作。'],
    // c6 Hans Müller（德国 · 工程承包商）
    ['We reviewed the contract draft. Clause 7 penalty terms need adjustment, and we need DIN-compliant electrical documentation.',
      '我们审阅了合同草案。第 7 条违约金条款需要调整，另外需要符合 DIN 标准的电气文件。'],
    ['Looks acceptable. Final question: can production photos be provided at each QC stage?',
      '基本可以接受。最后一个问题：每个质检节点都能提供生产照片吗？'],
    // c7 Emma Wilson（澳大利亚 · 经销商）
    ['Sample unit performing well, 3 client viewings this week. Planning Q3 order of 10 units with AU electrical.',
      '样板房表现很好，本周已有 3 组客户来看房。计划 Q3 下 10 套澳标电气版订单。'],
    ['Send PI. Also my builder asked about cyclone-region tie-down kits.',
      '把 PI 发过来。另外我的施工方问到飓风地区的锚固套件。'],
    // c11 Maria Silva（巴西 · 民宿业主）
    ['Olá! I watched your installation video. Beautiful! I want 2 units for my eco pousada near Paraty, sea view.',
      '你好！我看了你们的安装视频，太漂亮了！想为帕拉蒂附近的海景生态民宿订 2 套。'],
    ['Yes furnished please. Road is ok, we receive trucks. What is the price with bathroom and kitchen?',
      '要带家具的。路况没问题，我们能进卡车。带卫浴和厨房的价格是多少？'],
    // c12 John Smith（加拿大 · 终端个人）
    ['Hello, interested in one expandable unit for a farm stay in BC Canada. Main concern: winter goes to -30C. Will it work?',
      '你好，想为加拿大 BC 省的农场民宿买一套可扩展房。最担心的是：冬天会到 -30°C，扛得住吗？'],
    // c13 Fatima Zahra（摩洛哥 · 营地）
    ['Received your quotation for 8 units. We are reviewing with investors.',
      '已收到你们 8 套的报价，我们正在和投资人一起评估。'],
    // c14 David Lee（韩国 · 经销商）
    ['What is dealer price for Jeju island market? Small quantities first.',
      '济州岛市场的经销商价格是多少？想先从小批量做起。']
  ].forEach(function (p) { TRANSLATIONS[p[0]] = p[1]; });

  /* ---------- 私有：模拟客户自动回复池（按客户剧情定制 + 通用兜底） ---------- */
  var AUTO_REPLIES = {
    c1: [
      { en: 'Talked to my partner. If you can keep 8 units under $75k total FOB, we are ready to move this week.',
        zh: '和合伙人聊过了。如果 8 套 FOB 总价能控制在 $7.5 万以内，我们这周就可以推进。' },
      { en: 'One more thing — does the $9,800 include the furniture pack, or is that extra?',
        zh: '还有一件事——$9,800 含家具包吗，还是另外算？' }
    ],
    c2: [
      { en: 'Noted. Please also include the solar power option in the BOQ, our investors want off-grid capability.',
        zh: '收到。BOQ 里请把太阳能供电选项也加上，投资方希望具备离网能力。' },
      { en: 'Our team will be 4 people. Confirm airport pickup for the morning of July 15.',
        zh: '我们一行 4 人。请确认 7 月 15 日上午的接机安排。' }
    ],
    c5: [
      { en: 'OK my friend, last offer: I pay 30% deposit today for 10 units FD-13 if you give $3,000 each.',
        zh: '好吧朋友，最后报个数：FD-13 给我 $3,000 一套，10 套我今天就付 30% 定金。' },
      { en: 'Lagos buyers only look at price first. Send me your best CIF Lagos number.',
        zh: '拉各斯的买家都先看价格。把你们最优的 CIF 拉各斯价格发我。' }
    ],
    c6: [
      { en: 'Acceptable. We will sign on Friday and transfer the 30% deposit the same day. Prepare the final version.',
        zh: '可以接受。我们周五签约并当天支付 30% 定金。请准备最终版合同。' }
    ],
    c7: [
      { en: 'PI received. Add the tie-down kits for 4 of the 10 units, then I will sign and return tomorrow.',
        zh: 'PI 收到。10 套里给 4 套加上锚固套件，明天我就签回。' }
    ],
    c11: [
      { en: 'Great! Can the outside be white with wood color details? We want the beach house style.',
        zh: '太好了！外观能做白色配木色细节吗？我们想要海滩度假屋风格。' }
    ],
    c12: [
      { en: 'Good to hear about the Canada case. Please send the insulation spec sheet and any winter photos.',
        zh: '听到有加拿大案例就放心了。请把保温规格书和冬季实拍照片发我。' }
    ],
    c13: [
      { en: 'Good timing — our investors approved the phase-1 budget last week. Please send an updated quotation for 8 units.',
        zh: '来得正好——投资人上周批了一期预算。请发一份 8 套的更新报价。' }
    ],
    c14: [
      { en: 'We are still interested in Jeju. Send me the trial-dealer terms for 2 units please.',
        zh: '我们对济州岛市场还是有兴趣的。请把 2 套试单的经销条款发我。' }
    ]
  };
  var GENERIC_REPLIES = [
    { en: 'Thanks for the info. Let me review it and get back to you soon.',
      zh: '谢谢提供的信息，我看一下尽快回复你。' },
    { en: 'Sounds good. Could you also send the details to my email?',
      zh: '听起来不错。能把详细资料也发到我邮箱吗？' },
    { en: 'Understood. What would be the next step from your side?',
      zh: '明白了。接下来你们那边的流程是什么？' }
  ];

  /* ---------- 模块状态 ---------- */
  var state = {
    current: null,    // 当前选中客户 id
    trans: false,     // 中文对照翻译开关
    search: '',       // 会话列表搜索词
    sug: null,        // 当前销冠建议 {tactic, basis, en, zh}
    generating: false,
    replyIdx: {}      // 每个客户的自动回复轮换指针
  };
  var rootEl = null;

  /* ---------- 小工具 ---------- */
  function clip(s, n) {
    s = String(s == null ? '' : s);
    return s.length > n ? s.slice(0, n) + '…' : s;
  }
  function transFor(text) {
    return TRANSLATIONS[text] || ('[自动翻译] ' + text);
  }
  function hasChat(id) {
    var m = App.data.chats[id];
    return !!(m && m.length);
  }
  function chatCustomers() {
    return App.data.customers.filter(function (c) { return hasChat(c.id); });
  }
  function noChatCustomers() {
    return App.data.customers.filter(function (c) { return !hasChat(c.id); });
  }
  function lastThemMsg(cid) {
    var arr = App.data.chats[cid] || [];
    for (var i = arr.length - 1; i >= 0; i--) {
      if (arr[i].from === 'them') return arr[i].text;
    }
    return arr.length ? arr[arr.length - 1].text : '';
  }
  function matchSearch(c) {
    if (!state.search) return true;
    var kw = state.search.toLowerCase();
    return String(c.name).toLowerCase().indexOf(kw) >= 0 ||
      String(c.company).toLowerCase().indexOf(kw) >= 0;
  }

  /* ---------- 左栏：会话列表 ---------- */
  function paintList() {
    var listEl = rootEl.querySelector('#wa-list');
    if (!listEl) return;
    var withChat = chatCustomers().filter(matchSearch);
    var without = noChatCustomers().filter(matchSearch);
    var h = '';

    h += withChat.map(function (c) {
      var msgs = App.data.chats[c.id];
      var last = msgs[msgs.length - 1];
      return '<div class="wa-item' + (c.id === state.current ? ' active' : '') + '" data-id="' + App.esc(c.id) + '">' +
        App.ui.avatar(c.name) +
        '<div class="wa-item-main">' +
        '<div class="wa-item-top"><span class="wa-item-name">' + App.esc(c.name) + '</span>' +
        App.ui.intentBadge(c.intent) + '</div>' +
        '<div class="wa-item-sub"><span class="wa-item-last">' +
        (last.from === 'me' ? '我: ' : '') + App.esc(clip(last.text, 24)) + '</span>' +
        '<span class="small muted" style="flex-shrink:0">' + App.esc(last.time) + '</span></div>' +
        '</div></div>';
    }).join('');

    if (without.length) {
      h += '<div class="wa-group">无会话记录</div>';
      h += without.map(function (c) {
        return '<div class="wa-item disabled" data-nochat="1">' +
          App.ui.avatar(c.name) +
          '<div class="wa-item-main">' +
          '<div class="wa-item-top"><span class="wa-item-name">' + App.esc(c.name) + '</span>' +
          App.ui.intentBadge(c.intent) + '</div>' +
          '<div class="wa-item-sub"><span class="wa-item-last">' + App.esc(clip(c.company, 24)) + '</span></div>' +
          '</div></div>';
      }).join('');
    }

    if (!withChat.length && !without.length) {
      h = App.ui.empty('没有匹配的客户', '🔍');
    }
    listEl.innerHTML = h;

    // 事件绑定（innerHTML 之后）
    listEl.querySelectorAll('.wa-item').forEach(function (item) {
      item.onclick = function () {
        if (item.getAttribute('data-nochat')) {
          App.ui.toast('该客户暂无 WhatsApp 会话记录，可先在客户管理中发起触达（演示环境）');
          return;
        }
        var id = item.getAttribute('data-id');
        if (id === state.current) return;
        state.current = id;
        state.sug = null;
        state.generating = false;
        paintList();
        paintMid();
        paintRight();
      };
    });
  }

  /* ---------- 中栏：聊天窗口 ---------- */
  function paintMid() {
    var mid = rootEl.querySelector('#wa-mid');
    if (!mid) return;
    var c = App.findCustomer(state.current);
    if (!c) { mid.innerHTML = App.ui.empty('请选择左侧会话', '💬'); return; }

    mid.innerHTML =
      '<div class="wa-chat-head">' +
      '<div class="row" style="gap:10px;min-width:0">' + App.ui.avatar(c.name) +
      '<div style="min-width:0"><div class="bold" style="font-size:14px">' + App.esc(c.name) + '</div>' +
      '<div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
      App.esc(c.company) + ' · ' + App.esc((c.flag || '') + ' ' + c.country) + '</div></div></div>' +
      '<button class="btn btn-sm" id="wa-crm">CRM 档案</button>' +
      '</div>' +
      '<div class="wa-msgs" id="wa-msgs"></div>' +
      '<div class="wa-inputbar">' +
      '<textarea class="textarea" id="wa-text" rows="1" placeholder="输入消息，Enter 发送 / Shift+Enter 换行"></textarea>' +
      '<button class="btn btn-primary" id="wa-send">发送</button>' +
      '</div>';

    paintMsgs();

    mid.querySelector('#wa-crm').onclick = function () {
      App.ui.toast('可在客户管理中查看完整档案');
      App.navigate('crm');
    };
    mid.querySelector('#wa-send').onclick = doSend;
    mid.querySelector('#wa-text').onkeydown = function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        doSend();
      }
    };
  }

  function paintMsgs() {
    var box = rootEl.querySelector('#wa-msgs');
    if (!box) return;
    var msgs = App.data.chats[state.current] || [];
    if (!msgs.length) {
      box.innerHTML = App.ui.empty('暂无消息', '💬');
      return;
    }
    box.innerHTML = '<div class="chat-wrap">' + msgs.map(function (m) {
      var isMe = m.from === 'me';
      var trans = (!isMe && state.trans)
        ? '<span class="trans">' + App.esc(transFor(m.text)) + '</span>'
        : '';
      return '<div class="msg-row ' + (isMe ? 'me' : 'them') + '">' +
        '<div class="wa-col"><div class="bubble">' + App.esc(m.text) + trans + '</div>' +
        '<div class="msg-time">' + App.esc(m.time) + '</div></div></div>';
    }).join('') + '</div>';
    box.scrollTop = box.scrollHeight;
  }

  /* ---------- 发送 & 模拟客户回复 ---------- */
  function doSend() {
    var ta = rootEl.querySelector('#wa-text');
    if (!ta) return;
    var v = ta.value.trim();
    if (!v) { App.ui.toast('请先输入消息内容'); return; }
    var cid = state.current;
    var c = App.findCustomer(cid);
    App.data.chats[cid].push({ from: 'me', text: v, time: '刚刚' });
    ta.value = '';
    paintMsgs();
    paintList();

    // 约 2 秒后模拟客户回复
    setTimeout(function () {
      var pool = (AUTO_REPLIES[cid] || []).concat(GENERIC_REPLIES);
      var idx = state.replyIdx[cid] || 0;
      state.replyIdx[cid] = idx + 1;
      var r = pool[idx % pool.length];
      TRANSLATIONS[r.en] = r.zh; // 注册翻译，供中文对照使用
      App.data.chats[cid].push({ from: 'them', text: r.en, time: '刚刚' });
      if (!rootEl || !rootEl.isConnected) return; // 用户已离开本模块
      App.ui.toast('收到 ' + (c ? c.name : '客户') + ' 的新消息');
      if (state.current === cid) {
        paintMsgs();
        paintList();
        // 销冠辅助自动刷新并自动生成新建议
        paintRight();
        generateSuggestion();
      } else {
        paintList();
      }
    }, 2000);
  }

  /* ---------- 右栏：客户卡 + 销冠辅助 + 工具 ---------- */
  function paintRight() {
    var right = rootEl.querySelector('#wa-right');
    if (!right) return;
    var c = App.findCustomer(state.current);
    if (!c) { right.innerHTML = ''; return; }

    right.innerHTML =
      // a. 客户卡
      '<div class="card" style="padding:14px">' +
      '<div class="row" style="gap:10px">' + App.ui.avatar(c.name) +
      '<div style="min-width:0"><div class="bold">' + App.esc(c.name) + '</div>' +
      '<div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + App.esc(c.company) + '</div></div></div>' +
      '<div class="mt8 small muted">' + App.esc((c.flag || '') + ' ' + c.country) + ' · ' + App.esc(c.type) + '</div>' +
      '<div class="mt8">' + App.ui.stageBadge(c.stage) + ' ' + App.ui.intentBadge(c.intent) + '</div>' +
      '<div class="mt8">' + (c.tags || []).map(function (t) { return App.ui.chip(t); }).join('') + '</div>' +
      '</div>' +

      // b. 销冠辅助面板
      '<div class="ai-box" style="margin-bottom:16px" id="wa-suggest"></div>' +

      // c. 工具卡
      '<div class="card mb0" style="padding:14px">' +
      '<div class="card-title" style="font-size:14px;margin-bottom:10px">工具</div>' +
      '<div class="row-between mb12"><span style="font-size:13px">中文对照翻译</span>' +
      '<span class="switch' + (state.trans ? ' on' : '') + '" id="wa-trans"></span></div>' +
      '<button class="btn btn-block" id="wa-summary">📝 AI 跟进纪要</button>' +
      '<div class="small muted mt8" style="line-height:1.6">AI 通读本会话生成结构化纪要，可一键写入 CRM 跟进时间线。</div>' +
      '</div>';

    paintSuggestShell();

    right.querySelector('#wa-trans').onclick = function () {
      state.trans = !state.trans;
      this.classList.toggle('on', state.trans);
      paintMsgs();
      App.ui.toast(state.trans ? '已开启中文对照翻译' : '已关闭中文对照翻译');
    };
    right.querySelector('#wa-summary').onclick = openSummaryModal;
  }

  /* ---------- 销冠辅助面板 ---------- */
  function paintSuggestShell() {
    var box = rootEl.querySelector('#wa-suggest');
    if (!box) return;
    var quote = lastThemMsg(state.current);
    box.innerHTML =
      '<div class="row mb8" style="gap:6px"><span class="ai-tag">AI</span>' +
      '<span class="bold" style="font-size:13.5px">销冠辅助</span></div>' +
      '<div class="small muted">针对客户最新消息：</div>' +
      '<div class="small muted wa-quote">“' + App.esc(clip(quote, 70)) + '”</div>' +
      '<div id="wa-sug-body" class="mt8"></div>';
    paintSugIdle();
  }

  function paintSugIdle() {
    var body = rootEl.querySelector('#wa-sug-body');
    if (!body) return;
    body.innerHTML = '<button class="btn btn-primary btn-sm btn-block" id="wa-gen">✨ 生成建议回复</button>';
    body.querySelector('#wa-gen').onclick = function () { generateSuggestion(); };
  }

  function generateSuggestion() {
    if (state.generating) return;
    state.generating = true;
    var cid = state.current;
    var c = App.findCustomer(cid);
    var body = rootEl.querySelector('#wa-sug-body');
    if (!body || !c) { state.generating = false; return; }
    body.innerHTML = '';
    var stop = App.ai.thinking(body, '通读上下文 + 产品知识库 + 销冠打法…');
    App.ai.delay(1400).then(function () {
      stop();
      if (!rootEl.isConnected || state.current !== cid) { state.generating = false; return; }
      var sug = App.ai.suggestReply(c, lastThemMsg(cid));
      state.sug = sug;
      return paintSugResult(sug).then(function () { state.generating = false; });
    });
  }

  function anotherSuggestion() {
    if (state.generating) return;
    state.generating = true;
    var cid = state.current;
    var c = App.findCustomer(cid);
    var body = rootEl.querySelector('#wa-sug-body');
    if (!body || !c) { state.generating = false; return; }
    var play = App.data.champion.playbook;
    var pick, guard = 0;
    do {
      pick = play[Math.floor(Math.random() * play.length)];
      guard++;
    } while (state.sug && pick.tactic === state.sug.tactic && guard < 10);
    var first = String(c.name || 'there').split(' ')[0];
    var sug = {
      tactic: pick.tactic,
      basis: pick.basis || ('销冠话术库 · ' + pick.tactic),
      en: pick.scriptEn.replace(/\{name\}/g, first),
      zh: pick.scriptZh
    };
    body.innerHTML = '';
    var stop = App.ai.thinking(body, '从销冠话术库另选一套打法…');
    App.ai.delay(800).then(function () {
      stop();
      if (!rootEl.isConnected || state.current !== cid) { state.generating = false; return; }
      state.sug = sug;
      return paintSugResult(sug).then(function () { state.generating = false; });
    });
  }

  function paintSugResult(sug) {
    var body = rootEl.querySelector('#wa-sug-body');
    if (!body) return Promise.resolve();
    body.innerHTML =
      '<div class="mb8">' + App.ui.badge(sug.tactic, 'purple') + '</div>' +
      '<div class="small muted mb8">依据：' + App.esc(sug.basis) + '</div>' +
      '<div class="wa-sug-en" id="wa-sug-en"></div>' +
      '<div class="small muted mt8" style="line-height:1.6">中文对照：' + App.esc(sug.zh) + '</div>' +
      '<div class="mt8" style="display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="btn btn-sm btn-primary" id="wa-fill">填入输入框</button>' +
      '<button class="btn btn-sm" id="wa-another">换一条</button>' +
      '<button class="btn btn-sm btn-ghost" id="wa-collapse">收起</button>' +
      '</div>';
    body.querySelector('#wa-fill').onclick = function () {
      var ta = rootEl.querySelector('#wa-text');
      if (ta) { ta.value = state.sug.en; ta.focus(); }
      App.ui.toast('已填入，可修改后发送——AI 递话，人拍板');
    };
    body.querySelector('#wa-another').onclick = anotherSuggestion;
    body.querySelector('#wa-collapse').onclick = function () {
      state.sug = null;
      paintSugIdle();
    };
    return App.ai.typeInto(body.querySelector('#wa-sug-en'), sug.en, 90);
  }

  /* ---------- AI 跟进纪要弹窗 ---------- */
  function openSummaryModal() {
    var c = App.findCustomer(state.current);
    if (!c) return;
    var chats = App.data.chats[state.current] || [];
    var summary = null; // 生成完成后填充

    App.ui.modal(
      'AI 跟进纪要 · ' + c.name,
      '<div id="wa-sum-body" style="min-height:130px">' +
      '<div id="wa-sum-text" style="white-space:pre-wrap;font-size:13px;line-height:1.9"></div></div>',
      '<button class="btn" id="wa-sum-close">关闭</button>' +
      '<button class="btn btn-primary" id="wa-sum-save">写入 CRM</button>'
    );

    document.getElementById('wa-sum-close').onclick = App.ui.closeModal;
    document.getElementById('wa-sum-save').onclick = function () {
      if (!summary) { App.ui.toast('纪要生成中，请稍候'); return; }
      var mark = '【建议下一步】';
      var pos = summary.indexOf(mark);
      var next = pos >= 0 ? summary.slice(pos + mark.length).trim() : '';
      App.data.followups.unshift({
        customerId: c.id,
        date: '今天',
        by: 'AI 辅助',
        summary: summary,
        next: next
      });
      App.ui.toast('已写入 CRM 跟进时间线', 'ok');
      App.ui.closeModal();
    };

    // 思考动画 → 打字机输出纪要全文
    var bodyEl = document.getElementById('wa-sum-body');
    var textEl = document.getElementById('wa-sum-text');
    var stop = App.ai.thinking(bodyEl, 'AI 正在通读会话并撰写纪要…');
    App.ai.delay(1500).then(function () {
      stop();
      if (!document.getElementById('wa-sum-text')) return; // 弹窗已被关闭
      var s = App.ai.summarize(c, chats);
      App.ai.typeInto(textEl, s, 80).then(function () {
        summary = s;
      });
    });
  }

  /* ---------- 主渲染（演示：模拟会话工作台） ---------- */
  function renderDemo(el) {
    rootEl = el;
    state.search = '';
    state.sug = null;
    state.generating = false;

    // 跨模块跳转：CRM 等模块可设置 App.state.waTarget 定位客户
    if (App.state.waTarget) {
      var target = App.state.waTarget;
      App.state.waTarget = null;
      if (hasChat(target)) {
        state.current = target;
      } else {
        App.ui.toast('该客户暂无 WhatsApp 会话记录（演示数据）');
      }
    }
    if (!state.current || !hasChat(state.current)) {
      var list = chatCustomers();
      state.current = list.length ? list[0].id : null;
    }

    el.innerHTML =
      '<style>' +
      '.mod-whatsapp .wa-layout{display:flex;gap:12px;height:calc(100vh - 200px);min-height:480px}' +
      '.mod-whatsapp .wa-left{width:250px;min-width:250px;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);display:flex;flex-direction:column;overflow:hidden}' +
      '.mod-whatsapp .wa-search{padding:10px;border-bottom:1px solid var(--line)}' +
      '.mod-whatsapp .wa-list{flex:1;overflow-y:auto}' +
      '.mod-whatsapp .wa-item{display:flex;gap:8px;padding:10px 12px;cursor:pointer;border-bottom:1px solid #f1f3f7;align-items:center}' +
      '.mod-whatsapp .wa-item:hover{background:#f8fafc}' +
      '.mod-whatsapp .wa-item.active{background:var(--accent-soft)}' +
      '.mod-whatsapp .wa-item.active:hover{background:var(--accent-soft)}' +
      '.mod-whatsapp .wa-item.disabled{opacity:.55}' +
      '.mod-whatsapp .wa-item-main{flex:1;min-width:0}' +
      '.mod-whatsapp .wa-item-top{display:flex;align-items:center;gap:6px;justify-content:space-between}' +
      '.mod-whatsapp .wa-item-name{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.mod-whatsapp .wa-item-sub{display:flex;justify-content:space-between;gap:6px;margin-top:3px}' +
      '.mod-whatsapp .wa-item-last{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.mod-whatsapp .wa-group{padding:10px 12px 4px;font-size:11px;color:var(--faint);letter-spacing:1px}' +
      '.mod-whatsapp .wa-mid{flex:1;min-width:0;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);display:flex;flex-direction:column;overflow:hidden}' +
      '.mod-whatsapp .wa-chat-head{padding:10px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:10px}' +
      '.mod-whatsapp .wa-msgs{flex:1;overflow-y:auto;background:#efeae2;padding:14px}' +
      '.mod-whatsapp .wa-col{display:flex;flex-direction:column;max-width:72%}' +
      '.mod-whatsapp .wa-col .bubble{max-width:100%}' +
      '.mod-whatsapp .msg-row.me .wa-col{align-items:flex-end}' +
      '.mod-whatsapp .wa-col .msg-time{margin-top:3px}' +
      '.mod-whatsapp .wa-inputbar{padding:10px;border-top:1px solid var(--line);display:flex;gap:8px;align-items:flex-end}' +
      '.mod-whatsapp .wa-inputbar .textarea{min-height:42px;max-height:120px}' +
      '.mod-whatsapp .wa-right{width:300px;min-width:300px;overflow-y:auto;padding-right:2px}' +
      '.mod-whatsapp .wa-quote{font-style:italic;margin-top:4px;line-height:1.5}' +
      '.mod-whatsapp .wa-sug-en{background:#fff;border:1px solid var(--line);border-radius:8px;padding:9px 11px;font-size:13px;line-height:1.6;white-space:pre-wrap;min-height:34px}' +
      '</style>' +
      '<div class="mod-whatsapp">' +
      '<div class="notice">演示环境为模拟会话数据。正式版通过境外服务器中转 + WhatsApp API 接入，销售在国内浏览器直接使用，无需自行连外网。</div>' +
      '<div class="wa-layout">' +
      '<div class="wa-left">' +
      '<div class="wa-search"><div class="search-box"><input class="input" id="wa-search" placeholder="搜索姓名 / 公司"></div></div>' +
      '<div class="wa-list" id="wa-list"></div>' +
      '</div>' +
      '<div class="wa-mid" id="wa-mid"></div>' +
      '<div class="wa-right" id="wa-right"></div>' +
      '</div>' +
      '</div>';

    // 搜索（input 在列表容器之外，重画列表不丢焦点）
    el.querySelector('#wa-search').oninput = function () {
      state.search = this.value.trim();
      paintList();
    };

    paintList();
    paintMid();
    paintRight();
  }

  /* ================= 真实通道B：协议/网页版（扫码挂现有号） ================= */
  var liveTimer = null;
  var liveState = { current: null, sending: false };
  function stopLivePoll() { if (liveTimer) { clearInterval(liveTimer); liveTimer = null; } }

  function esc(s) { return App.esc(s); }
  function fmtTs(ts) {
    if (!ts) return '';
    var d = new Date(ts), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function liveStyles() {
    return '<style>' +
      '.mod-wa2{display:flex;flex-direction:column;height:calc(100vh - 130px)}' +
      '.mod-wa2 .wa2-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}' +
      '.mod-wa2 .wa2-body{flex:1;display:flex;gap:12px;min-height:0}' +
      '.mod-wa2 .wa2-list{width:300px;min-width:260px;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow-y:auto}' +
      '.mod-wa2 .wa2-chat{flex:1;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}' +
      '.mod-wa2 .wa2-item{padding:11px 13px;border-bottom:1px solid var(--line);cursor:pointer}' +
      '.mod-wa2 .wa2-item:hover{background:var(--accent-soft)}' +
      '.mod-wa2 .wa2-item.on{background:var(--accent-soft)}' +
      '.mod-wa2 .wa2-item .nm{font-weight:600;font-size:13px}' +
      '.mod-wa2 .wa2-item .ls{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}' +
      '.mod-wa2 .wa2-msgs{flex:1;overflow-y:auto;background:#efeae2;padding:14px;display:flex;flex-direction:column;gap:8px}' +
      '.mod-wa2 .wa2-b{max-width:72%;padding:8px 11px;border-radius:10px;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word}' +
      '.mod-wa2 .wa2-b.them{background:#fff;align-self:flex-start}' +
      '.mod-wa2 .wa2-b.me{background:#d9fdd3;align-self:flex-end}' +
      '.mod-wa2 .wa2-b .tt{font-size:10px;color:var(--faint);margin-top:3px;text-align:right}' +
      '.mod-wa2 .wa2-input{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line)}' +
      '.mod-wa2 .wa2-qr{display:flex;flex-direction:column;align-items:center;gap:14px;padding:30px;text-align:center}' +
      '.mod-wa2 .wa2-qr img{width:240px;height:240px;border:1px solid var(--line);border-radius:8px}' +
      '.mod-wa2 .wa2-qr .ph{width:240px;height:240px;border:1px dashed var(--line);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px;padding:16px}' +
      '</style>';
  }

  function render(el) {
    rootEl = el;
    stopLivePoll();
    // 在线模式且开启了 WhatsApp 通道 → 真实工作台；否则用演示工作台（预览/未开启）
    if (window.App && App.isLive && App.isLive()) {
      el.innerHTML = '<div class="mod-wa2"><div class="card">正在加载 WhatsApp 通道…</div></div>';
      App.api.get('/api/whatsapp/status').then(function (s) {
        if (s && s.channel && s.channel !== 'off') renderLive(el, s);
        else renderDemo(el);
      }).catch(function () { renderDemo(el); });
      return;
    }
    renderDemo(el);
  }

  function renderLive(el, s) {
    stopLivePoll();
    if (s.status !== 'connected') return renderConnect(el, s);
    renderWorkbench(el, s);
  }

  /* ---- 未连接：扫码面板 ---- */
  function renderConnect(el, s) {
    var inner;
    if (s.status === 'qr' && s.qr) {
      var qrHtml = /^data:image/.test(s.qr)
        ? '<img src="' + esc(s.qr) + '" alt="二维码">'
        : '<div class="ph">二维码已生成（在能联网的机器上会显示为可扫图片）<br><br>' + esc(String(s.qr).slice(0, 40)) + '…</div>';
      inner = '<div class="wa2-qr">' + qrHtml +
        '<div><b>用手机 WhatsApp 扫码登录</b><div class="small muted mt8">手机 WhatsApp → 设置 → 已连接的设备 → 连接设备 → 扫这个码</div></div>' +
        '<div class="small muted">连接后你现有的号和历史会话会同步过来，可直接在这里收发。</div></div>';
    } else if (s.status === 'connecting') {
      inner = '<div class="wa2-qr"><div class="ph">正在连接 WhatsApp…</div></div>';
    } else {
      inner = '<div class="wa2-qr"><div class="ph">📱</div>' +
        '<div><b>连接你的 WhatsApp 号</b><div class="small muted mt8">扫码把现有号挂上来，续用历史会话，销售在国内浏览器直接收发，无需各自开 VPN。</div></div>' +
        '<button class="btn btn-primary" id="wa2-connect">扫码连接 WhatsApp</button>' +
        (s.error ? '<div class="small text-bad">' + esc(s.error) + '</div>' : '') + '</div>';
    }
    el.innerHTML = liveStyles() + '<div class="mod-wa2">' +
      '<div class="wa2-bar"><div><b>💬 WhatsApp 工作台 · 协议直连</b> <span class="small muted">通道B：扫码挂现有号</span></div>' +
      '<span class="badge badge-warn">未连接</span></div>' +
      '<div class="wa2-body"><div class="wa2-chat">' + inner + '</div></div>' +
      '<div class="notice mt12">仅用于老客户 1 对 1 维护，请勿群发/高频主动触达，以降低封号风险。</div></div>';

    var btn = el.querySelector('#wa2-connect');
    if (btn) btn.onclick = function () {
      btn.disabled = true; btn.textContent = '正在生成二维码…';
      App.api.post('/api/whatsapp/connect', {}).then(function () { pollConnect(el); })
        .catch(function (e) { App.ui.toast('连接失败：' + e.message, 'bad'); btn.disabled = false; btn.textContent = '扫码连接 WhatsApp'; });
    };
    // qr/connecting 状态下轮询直到连上
    if (s.status === 'qr' || s.status === 'connecting') pollConnect(el);
  }

  function pollConnect(el) {
    stopLivePoll();
    liveTimer = setInterval(function () {
      if (!document.body.contains(el)) { stopLivePoll(); return; }
      App.api.get('/api/whatsapp/status').then(function (s) {
        if (s.status === 'connected') { stopLivePoll(); renderWorkbench(el, s); }
        else renderConnectRefresh(el, s);
      }).catch(function () {});
    }, 1500);
  }
  // 仅刷新二维码区域，避免整页重绑（简单起见直接重画连接面板但不重启轮询）
  function renderConnectRefresh(el, s) {
    var body = el.querySelector('.mod-wa2 .wa2-body .wa2-chat');
    if (!body) { renderConnect(el, s); pollConnect(el); return; }
    if (s.status === 'qr' && s.qr && /^data:image/.test(s.qr)) {
      body.innerHTML = '<div class="wa2-qr"><img src="' + esc(s.qr) + '" alt="二维码"><div><b>用手机 WhatsApp 扫码登录</b>' +
        '<div class="small muted mt8">设置 → 已连接的设备 → 连接设备</div></div></div>';
    }
  }

  /* ---- 已连接：真实会话工作台 ---- */
  function renderWorkbench(el, s) {
    stopLivePoll();
    el.innerHTML = liveStyles() + '<div class="mod-wa2">' +
      '<div class="wa2-bar">' +
      '<div><b>💬 WhatsApp 工作台 · 协议直连</b> <span class="small muted">已连接：' + esc(s.me && (s.me.name || s.me.id) || '') + '</span></div>' +
      '<button class="btn btn-sm btn-danger" id="wa2-logout">断开</button></div>' +
      '<div class="wa2-body">' +
      '<div class="wa2-list" id="wa2-list"></div>' +
      '<div class="wa2-chat" id="wa2-chat"><div class="wa2-qr"><div class="ph">← 选择左侧一个会话开始</div></div></div>' +
      '</div>' +
      '<div class="notice mt12">仅用于老客户 1 对 1 维护，请勿群发/高频主动触达（系统已限速 ' + Math.round(8) + ' 秒/条），以降低封号风险。</div></div>';

    el.querySelector('#wa2-logout').onclick = function () {
      if (!window.confirm('确定断开 WhatsApp？断开后需重新扫码。')) return;
      App.api.post('/api/whatsapp/logout', {}).then(function () { render(el); });
    };
    loadChats(el);
    // 已连接时定时刷新会话/消息（收新消息）
    liveTimer = setInterval(function () {
      if (!document.body.contains(el)) { stopLivePoll(); return; }
      loadChats(el, true);
      if (liveState.current) loadMessages(el, liveState.current, true);
    }, 4000);
  }

  function loadChats(el, quiet) {
    App.api.get('/api/whatsapp/chats').then(function (d) {
      var box = el.querySelector('#wa2-list'); if (!box) return;
      var chats = d.chats || [];
      if (!chats.length) { box.innerHTML = '<div class="wa2-item"><div class="small muted">暂无会话。对方给你发消息后会出现在这里。</div></div>'; return; }
      box.innerHTML = chats.map(function (c) {
        return '<div class="wa2-item' + (liveState.current === c.jid ? ' on' : '') + '" data-jid="' + esc(c.jid) + '">' +
          '<div class="nm">' + esc(c.name) + '</div><div class="ls">' + esc(c.lastText || '') + '</div></div>';
      }).join('');
      box.querySelectorAll('[data-jid]').forEach(function (it) {
        it.onclick = function () { liveState.current = it.getAttribute('data-jid'); loadChats(el, true); openChat(el, it.getAttribute('data-jid')); };
      });
    }).catch(function () {});
  }

  function openChat(el, jid) {
    var chat = el.querySelector('#wa2-chat'); if (!chat) return;
    chat.innerHTML = '<div class="wa2-msgs" id="wa2-msgs"></div>' +
      '<div class="wa2-input"><textarea class="textarea" id="wa2-text" placeholder="输入消息，回车发送（Shift+回车换行）" style="flex:1;min-height:42px"></textarea>' +
      '<button class="btn btn-primary" id="wa2-send">发送</button></div>';
    loadMessages(el, jid);
    var ta = chat.querySelector('#wa2-text');
    chat.querySelector('#wa2-send').onclick = function () { doLiveSend(el, jid); };
    ta.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doLiveSend(el, jid); } };
  }

  function loadMessages(el, jid, quiet) {
    App.api.get('/api/whatsapp/messages?jid=' + encodeURIComponent(jid)).then(function (d) {
      var box = el.querySelector('#wa2-msgs'); if (!box) return;
      var atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
      box.innerHTML = (d.messages || []).map(function (m) {
        return '<div class="wa2-b ' + (m.from === 'me' ? 'me' : 'them') + '">' + esc(m.text) +
          '<div class="tt">' + fmtTs(m.ts) + '</div></div>';
      }).join('');
      if (!quiet || atBottom) box.scrollTop = box.scrollHeight;
    }).catch(function () {});
  }

  function doLiveSend(el, jid) {
    if (liveState.sending) return;
    var ta = el.querySelector('#wa2-text'); if (!ta) return;
    var text = ta.value.trim(); if (!text) return;
    liveState.sending = true;
    App.api.post('/api/whatsapp/send', { jid: jid, text: text }).then(function () {
      ta.value = ''; liveState.sending = false;
      loadMessages(el, jid); loadChats(el, true);
    }).catch(function (e) {
      liveState.sending = false;
      App.ui.toast(e.message, 'bad');   // 含限速提示
    });
  }

  App.registerModule({
    id: 'whatsapp',
    nav: { section: '销转端', label: 'WhatsApp 工作台', icon: '💬' },
    render: render
  });
})();
