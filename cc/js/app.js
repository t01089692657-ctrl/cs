/* ============ 外贸全链路 AI 系统 · 应用框架 ============
 * 全局对象 App：模块注册、路由、UI 工具、模拟 AI 工具。
 * 各功能模块文件通过 App.registerModule({...}) 注册，
 * 模块间共享数据一律读写 App.data（来自 core-data.js）。
 */
window.App = (function () {
  'use strict';

  /* ---------- 导航结构（模块按此顺序展示） ---------- */
  var NAV_SECTIONS = [
    { section: '总览', ids: ['dashboard'] },
    { section: '流量端 · 解决进线', ids: ['video-factory', 'ads', 'prospecting'] },
    { section: '销转端 · 复制销冠', ids: ['leads', 'crm', 'whatsapp', 'analysis', 'qualify'] },
    { section: '企业管理端 · 提效', ids: ['tech-avatar', 'boss-avatar', 'hr-finance'] },
    { section: '系统设置', ids: ['knowledge', 'admin'] }
  ];

  var modules = {};   // id -> {id, nav:{section,label,icon}, render(el)}
  var App = {};

  App.state = {};     // 跨模块临时状态（如 waTarget: 从CRM跳转WhatsApp时定位的客户id）

  App.registerModule = function (mod) {
    if (!mod || !mod.id || typeof mod.render !== 'function') {
      console.warn('registerModule: 非法模块', mod);
      return;
    }
    modules[mod.id] = mod;
  };

  /* ---------- 启动 & 路由 ---------- */
  // 模块可注册数据就绪回调（App.data 赋值并加载持久化数据后、首次路由前执行）
  var dataHooks = [];
  App.onDataReady = function (fn) { dataHooks.push(fn); };

  App.start = function () {
    App.data = window.AppData;
    // 先探测后端：有则在线模式（需登录、数据走服务器），无则演示模式（localStorage）
    (App.api ? App.api.detect() : Promise.resolve(false)).then(function (live) {
      if (live) return startLive();
      return startDemo();
    }).catch(function (e) {
      console.warn('启动探测失败，回退演示模式:', e);
      startDemo();
    });
  };

  function finishStart() {
    dataHooks.forEach(function (fn) {
      try { fn(); } catch (e) { console.warn('onDataReady 回调出错:', e); }
    });
    document.getElementById('company-name').textContent = App.data.company.name;
    buildNav();
    App.renderUserChip();
    window.removeEventListener('hashchange', route);
    window.addEventListener('hashchange', route);
    route();
  }

  // 演示模式：与从前完全一致（localStorage）
  function startDemo() {
    App.mode = 'demo';
    loadPersisted();
    finishStart();
  }

  // 在线模式：需登录 → 从服务器加载共享数据 → 预载服务配置
  function startLive() {
    App.mode = 'live';
    if (!App.api.token()) { App.api.showLogin(); return Promise.resolve(); }
    return App.api.get('/api/auth/me').then(function (me) {
      App.api.user = me;
    }).then(function () {
      return App.api.get('/api/collections');
    }).then(function (cols) {
      PERSIST_KEYS.forEach(function (k) {
        if (cols && k in cols && cols[k] != null) {
          App.data[k] = cols[k];
          snapshot[k] = JSON.stringify(cols[k]);
        }
      });
      // videoTemplates 也走服务器（模板 10 人共享）
      if (cols && cols.videoTemplates != null) {
        App.data.videoTemplates = cols.videoTemplates;
        snapshot.videoTemplates = JSON.stringify(cols.videoTemplates);
      }
      return App.services && App.services._preload ? App.services._preload() : null;
    }).then(function () {
      finishStart();
    }).catch(function (e) {
      // token 失效等：回登录页
      App.api.setToken('');
      App.api.showLogin(e.message || '登录状态失效，请重新登录');
    });
  }

  /* ---------- 数据持久化 ----------
   * 演示模式：浏览器 localStorage。
   * 在线模式：只把“变化过的集合”PUT 到服务器（按快照 diff，避免重复上传大图）。
   */
  var PERSIST_KEYS = ['products', 'videoQueue', 'videoProjects', 'icp', 'prospects'];
  var LIVE_KEYS = PERSIST_KEYS.concat(['videoTemplates']);
  var PERSIST_STORE = 'app_data_v1';
  var snapshot = {};  // 在线模式：key -> 上次已推送内容的 JSON，用于 diff

  function loadPersisted() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(PERSIST_STORE) || 'null'); } catch (e) { s = null; }
    if (!s) return;
    // 注意：空数组也是有效状态（如用户清空了视频仓库），只要存过该键就采用
    PERSIST_KEYS.forEach(function (k) {
      if (k in s && s[k] != null) App.data[k] = s[k];
    });
  }

  App.persist = function () {
    if (App.isLive && App.isLive()) {
      // 只推送变化过的集合
      LIVE_KEYS.forEach(function (k) {
        if (App.data[k] == null) return;
        var cur = JSON.stringify(App.data[k]);
        if (cur === snapshot[k]) return;
        snapshot[k] = cur;
        App.api.put('/api/collections/' + k, { data: App.data[k] })
          .catch(function (e) { App.ui.toast('保存到服务器失败：' + e.message, 'bad'); });
      });
      return true;
    }
    try {
      var s = {};
      PERSIST_KEYS.forEach(function (k) { s[k] = App.data[k]; });
      localStorage.setItem(PERSIST_STORE, JSON.stringify(s));
      return true;
    } catch (e) {
      App.ui.toast('浏览器存储空间不足，本次修改可能在刷新后丢失。建议删除部分产品图片。', 'bad');
      return false;
    }
  };

  /* ---------- 图片工具：读取本地图片并压缩为 dataURL ---------- */
  App.img = {};
  // file -> Promise<dataURL>（等比缩到 maxSide 内，JPEG 压缩，控制 localStorage 占用）
  App.img.readAndShrink = function (file, maxSide) {
    maxSide = maxSide || 640;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('不是图片文件')); return; }
      var fr = new FileReader();
      fr.onerror = function () { reject(new Error('读取文件失败')); };
      fr.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('图片解析失败')); };
        img.onload = function () {
          var w = img.width, h = img.height;
          var scale = Math.min(1, maxSide / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
          var cv = document.createElement('canvas');
          cv.width = cw; cv.height = ch;
          cv.getContext('2d').drawImage(img, 0, 0, cw, ch);
          resolve(cv.toDataURL('image/jpeg', 0.78));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  };

  App.navigate = function (id) {
    if (location.hash === '#/' + id) { route(); }
    else { location.hash = '#/' + id; }
  };

  function currentId() {
    var h = (location.hash || '').replace(/^#\//, '');
    return h && modules[h] ? h : 'dashboard';
  }

  // 管理后台等仅管理员模块：仅在线且当前用户为 admin 时显示
  function moduleVisible(m) {
    if (!m) return false;
    if (m.adminOnly) return App.mode === 'live' && App.api && App.api.user && App.api.user.role === 'admin';
    return true;
  }

  function buildNav() {
    var nav = document.getElementById('nav');
    var html = '';
    var placed = {};
    NAV_SECTIONS.forEach(function (sec) {
      var items = sec.ids.filter(function (id) { return modules[id] && moduleVisible(modules[id]); });
      if (!items.length) return;
      html += '<div class="nav-section">' + sec.section + '</div>';
      items.forEach(function (id) {
        placed[id] = true;
        var m = modules[id];
        html += '<a class="nav-item" data-id="' + id + '" href="#/' + id + '">' +
          '<span class="nav-icon">' + (m.nav.icon || '·') + '</span>' + m.nav.label + '</a>';
      });
    });
    // 未在预设顺序里的模块兜底展示
    Object.keys(modules).forEach(function (id) {
      if (!placed[id] && moduleVisible(modules[id])) {
        var m = modules[id];
        html += '<a class="nav-item" data-id="' + id + '" href="#/' + id + '">' +
          '<span class="nav-icon">' + (m.nav.icon || '·') + '</span>' + m.nav.label + '</a>';
      }
    });
    nav.innerHTML = html;
  }

  // 顶栏显示当前登录用户 + 退出（仅在线模式）
  App.renderUserChip = function () {
    if (App.mode !== 'live' || !App.api || !App.api.user) return;
    var el = document.getElementById('company-name');
    if (!el) return;
    var u = App.api.user;
    el.innerHTML = App.esc(App.data.company.name) + ' · <b>' + App.esc(u.name || u.email) + '</b>（' +
      ({ admin: '管理员', sales: '销售', ops: '运营' }[u.role] || u.role) + '） ' +
      '<a href="#" id="logout-link" style="color:var(--muted);font-size:12px">退出</a>';
    var lk = document.getElementById('logout-link');
    if (lk) lk.onclick = function (e) { e.preventDefault(); App.api.logout(); };
  };

  function route() {
    var id = currentId();
    var mod = modules[id];
    document.querySelectorAll('.nav-item').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-id') === id);
    });
    document.getElementById('page-title').textContent = mod.nav.label;
    var content = document.getElementById('content');
    content.scrollTop = 0;
    content.innerHTML = '';
    try {
      mod.render(content);
    } catch (e) {
      console.error('模块渲染出错:', id, e);
      content.innerHTML = '<div class="card"><div class="card-title">模块加载出错</div>' +
        '<div class="muted small">' + App.esc(String(e && e.message || e)) + '</div></div>';
    }
  }

  /* ---------- 工具 ---------- */
  App.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  App.fmt = {
    money: function (n) {
      if (n == null || isNaN(n)) return '-';
      return '$' + Number(n).toLocaleString('en-US');
    },
    num: function (n) { return n == null ? '-' : Number(n).toLocaleString('en-US'); },
    pct: function (n) { return n == null ? '-' : (Math.round(n * 10) / 10) + '%'; }
  };

  /* ---------- UI 工具（均返回 HTML 字符串，除 modal/toast 直接操作 DOM） ---------- */
  App.ui = {};

  App.ui.badge = function (text, type) {
    return '<span class="badge badge-' + (type || 'gray') + '">' + App.esc(text) + '</span>';
  };

  // 意向等级 A/B/C/D -> 颜色
  App.ui.intentBadge = function (level) {
    var map = { A: 'bad', B: 'warn', C: 'info', D: 'gray' };
    var label = { A: 'A·强意向', B: 'B·有意向', C: 'C·观望', D: 'D·弱' };
    return App.ui.badge(label[level] || level, map[level] || 'gray');
  };

  App.ui.stageBadge = function (stage) {
    var late = ['PI/合同', '定金收取', '生产中', '发货/尾款', '成交复购'];
    var type = stage === '流失' ? 'gray' : (late.indexOf(stage) >= 0 ? 'ok' : 'accent');
    return App.ui.badge(stage, type);
  };

  App.ui.chip = function (text, removable) {
    return '<span class="chip">' + App.esc(text) +
      (removable ? ' <span class="x" data-chip="' + App.esc(text) + '">×</span>' : '') + '</span>';
  };

  App.ui.kpi = function (label, value, sub) {
    return '<div class="kpi"><div class="kpi-label">' + App.esc(label) + '</div>' +
      '<div class="kpi-value">' + value + '</div>' +
      (sub ? '<div class="kpi-sub">' + sub + '</div>' : '') + '</div>';
  };

  App.ui.avatar = function (name, small) {
    var colors = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#d97706', '#dc2626', '#db2777'];
    var s = String(name || '?');
    var code = 0;
    for (var i = 0; i < s.length; i++) code += s.charCodeAt(i);
    var ch = s.trim().charAt(0).toUpperCase();
    return '<span class="avatar' + (small ? ' avatar-sm' : '') + '" style="background:' +
      colors[code % colors.length] + '">' + App.esc(ch) + '</span>';
  };

  App.ui.progress = function (pct, cls) {
    pct = Math.max(0, Math.min(100, pct || 0));
    return '<div class="progress"><div class="progress-bar ' + (cls || '') + '" style="width:' + pct + '%"></div></div>';
  };

  App.ui.empty = function (msg, icon) {
    return '<div class="empty"><div class="empty-icon">' + (icon || '📭') + '</div>' + App.esc(msg || '暂无数据') + '</div>';
  };

  // 表格：cols = [{key, label, render(row)?, width?}], rows = 对象数组
  App.ui.table = function (cols, rows, opts) {
    opts = opts || {};
    var h = '<table class="tbl"><thead><tr>';
    cols.forEach(function (c) {
      h += '<th' + (c.width ? ' style="width:' + c.width + '"' : '') + '>' + App.esc(c.label) + '</th>';
    });
    h += '</tr></thead><tbody>';
    if (!rows || !rows.length) {
      h += '<tr><td colspan="' + cols.length + '">' + App.ui.empty(opts.emptyMsg || '暂无数据') + '</td></tr>';
    } else {
      rows.forEach(function (r, idx) {
        h += '<tr' + (opts.rowAttr ? ' ' + opts.rowAttr(r, idx) : '') + '>';
        cols.forEach(function (c) {
          var v = c.render ? c.render(r, idx) : App.esc(r[c.key]);
          h += '<td>' + (v == null ? '-' : v) + '</td>';
        });
        h += '</tr>';
      });
    }
    return h + '</tbody></table>';
  };

  // 简易 SVG 横向条形图：data = [{label, v}]
  App.ui.svgBars = function (data, opts) {
    opts = opts || {};
    var max = Math.max.apply(null, data.map(function (d) { return d.v; }).concat([1]));
    var color = opts.color || 'var(--accent)';
    var h = '<div>';
    data.forEach(function (d) {
      var pct = Math.round(d.v / max * 100);
      h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<div style="width:' + (opts.labelWidth || '90px') + ';font-size:12px;color:var(--muted);text-align:right;flex-shrink:0">' + App.esc(d.label) + '</div>' +
        '<div style="flex:1;background:#eef1f6;border-radius:4px;height:18px;overflow:hidden">' +
        '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:4px"></div></div>' +
        '<div style="width:44px;font-size:12px;font-weight:600">' + App.fmt.num(d.v) + '</div></div>';
    });
    return h + '</div>';
  };

  // 简易 SVG 折线图：values = 数字数组
  App.ui.svgLine = function (values, opts) {
    opts = opts || {};
    var w = opts.width || 320, ht = opts.height || 90, pad = 6;
    var max = Math.max.apply(null, values.concat([1]));
    var min = Math.min.apply(null, values.concat([0]));
    var span = (max - min) || 1;
    var pts = values.map(function (v, i) {
      var x = pad + i * ((w - pad * 2) / Math.max(values.length - 1, 1));
      var y = ht - pad - ((v - min) / span) * (ht - pad * 2);
      return x.toFixed(1) + ',' + y.toFixed(1);
    });
    return '<svg width="100%" viewBox="0 0 ' + w + ' ' + ht + '" preserveAspectRatio="none" style="display:block">' +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + (opts.color || '#2563eb') + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      pts.map(function (p) {
        var xy = p.split(',');
        return '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="2.6" fill="' + (opts.color || '#2563eb') + '"/>';
      }).join('') + '</svg>';
  };

  /* ---------- 弹窗 / 提示 ---------- */
  App.ui.modal = function (title, bodyHtml, footHtml, opts) {
    opts = opts || {};
    var root = document.getElementById('modal-root');
    root.innerHTML =
      '<div class="modal-mask" id="modal-mask"><div class="modal ' + (opts.large ? 'modal-lg' : '') + '">' +
      '<div class="modal-head"><h3>' + App.esc(title) + '</h3><span class="modal-close" id="modal-close">✕</span></div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      (footHtml ? '<div class="modal-foot">' + footHtml + '</div>' : '') +
      '</div></div>';
    document.getElementById('modal-close').onclick = App.ui.closeModal;
    document.getElementById('modal-mask').addEventListener('click', function (e) {
      if (e.target === this) App.ui.closeModal();
    });
    return root;
  };

  App.ui.closeModal = function () {
    document.getElementById('modal-root').innerHTML = '';
  };

  App.ui.toast = function (msg, type) {
    var root = document.getElementById('toast-root');
    var el = document.createElement('div');
    el.className = 'toast' + (type ? ' toast-' + type : '');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 320);
    }, 2600);
  };

  /* ---------- 模拟 AI（原型阶段为规则+预设内容；正式版替换为大模型 API 调用） ---------- */
  App.ai = {};

  App.ai.delay = function (ms) {
    return new Promise(function (res) { setTimeout(res, ms); });
  };

  // 在容器里显示"思考中"动画，返回 stop() 用于移除
  App.ai.thinking = function (el, label) {
    var box = document.createElement('div');
    box.innerHTML = '<div class="row" style="gap:8px"><span class="ai-tag">AI</span>' +
      '<span class="thinking"><span></span><span></span><span></span></span>' +
      '<span class="muted small">' + App.esc(label || '思考中…') + '</span></div>';
    el.appendChild(box);
    return function stop() { box.remove(); };
  };

  // 打字机效果：把 text 逐字打进 el（textContent 方式，安全）
  App.ai.typeInto = function (el, text, cps) {
    cps = cps || 55;
    el.classList.add('typing-caret');
    el.textContent = '';
    var i = 0;
    return new Promise(function (res) {
      var timer = setInterval(function () {
        i += Math.max(1, Math.round(cps / 30));
        el.textContent = text.slice(0, i);
        if (el.scrollIntoView && i % 40 === 0) el.scrollIntoView({ block: 'nearest' });
        if (i >= text.length) {
          clearInterval(timer);
          el.classList.remove('typing-caret');
          res();
        }
      }, 33);
    });
  };

  // 销冠辅助：根据客户与其最新一条消息，从销冠话术库中匹配建议
  App.ai.suggestReply = function (customer, lastMsg) {
    var msg = String(lastMsg || '').toLowerCase();
    var play = App.data.champion.playbook;
    var hit = null;
    for (var i = 0; i < play.length; i++) {
      var trig = play[i].triggers || [];
      for (var j = 0; j < trig.length; j++) {
        if (msg.indexOf(trig[j]) >= 0) { hit = play[i]; break; }
      }
      if (hit) break;
    }
    if (!hit) hit = play[play.length - 1]; // 最后一条为通用推进话术
    var en = hit.scriptEn.replace(/\{name\}/g, (customer && customer.name || 'there').split(' ')[0]);
    return {
      tactic: hit.tactic,
      basis: hit.basis || '销冠话术库 · ' + hit.tactic,
      en: en,
      zh: hit.scriptZh
    };
  };

  // AI 跟进纪要：读一段聊天记录生成结构化中文纪要
  App.ai.summarize = function (customer, chat) {
    var text = (chat || []).map(function (m) { return m.text; }).join(' ').toLowerCase();
    var focus = [];
    if (/price|cost|expensive|budget|quote/.test(text)) focus.push('价格与预算');
    if (/ship|freight|port|delivery time|lead time/.test(text)) focus.push('运费与交期');
    if (/quality|material|steel|insulation|certificat/.test(text)) focus.push('品质与认证');
    if (/sample|visit|factory/.test(text)) focus.push('样品/验厂');
    if (/moq|quantity|units|container/.test(text)) focus.push('起订量与柜量');
    if (!focus.length) focus.push('基础产品信息');
    var next = {
      '新询盘': '24小时内完成需求确认，问清用途/数量/时间线',
      '需求确认': '发送对应型号方案与三档报价',
      '方案与报价': '48小时内跟进报价反馈，推动样品或看厂',
      '样品/看厂': '确认样品单/接待安排，推进 PI',
      'PI/合同': '催定金，同步排产计划',
      '定金收取': '发送生产节点计划表',
      '生产中': '每周发生产进度照片/视频',
      '发货/尾款': '发提单副本收尾款，交付安装资料',
      '成交复购': '两周后回访使用情况，寻求转介绍',
      '流失': '归档原因，加入 3 个月后唤醒名单'
    };
    return '【客户关注点】' + focus.join('、') +
      '\n【沟通阶段判断】' + (customer.stage || '新询盘') + '（意向 ' + (customer.intent || 'C') + '）' +
      '\n【客户情况】' + (customer.country || '') + ' · ' + (customer.type || '') + '，预估金额 ' + App.fmt.money(customer.value) +
      '\n【建议下一步】' + (next[customer.stage] || next['新询盘']);
  };

  /* ---------- 小工具：跨模块查客户 ---------- */
  App.findCustomer = function (id) {
    var list = App.data.customers;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };

  return App;
})();
