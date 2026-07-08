/* ============ 前端 API 客户端 + 登录 ============
 * 启动时探测 /api/health：
 *   探测到后端 → 【在线模式】：需登录，数据走服务器，10 人共享。
 *   探测不到  → 【演示模式】：保持原有 localStorage 行为（预览版/离线可用）。
 * 所有“是否走后端”的判断只看 App.api.live，演示模式行为与从前完全一致。
 */
window.App = window.App || {};
(function () {
  'use strict';
  var TOKEN_KEY = 'auth_token_v1';

  var api = {
    live: false,
    modes: null,
    user: null,

    token: function () { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } },
    setToken: function (t) {
      try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    },

    // 探测后端是否存在（同域 /api/health）
    detect: function () {
      return fetch('/api/health', { method: 'GET' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && d.ok) { api.live = true; api.modes = d.modes; api.getkeUrl = d.getkeUrl || ''; }
          return api.live;
        })
        .catch(function () { api.live = false; return false; });
    },

    req: function (method, path, body) {
      var headers = { 'Content-Type': 'application/json' };
      var tk = api.token();
      if (tk) headers['Authorization'] = 'Bearer ' + tk;
      var isLogin = path.indexOf('/api/auth/login') >= 0;
      return fetch(path, {
        method: method, headers: headers,
        body: body != null ? JSON.stringify(body) : undefined
      }).then(function (r) {
        return r.json().catch(function () { return null; }).then(function (data) {
          // 已登录状态下的 401 = 会话过期，回登录页；登录接口/未登录的 401 交调用方处理
          if (r.status === 401 && api.token() && !isLogin) {
            api.setToken(''); location.reload();
            throw new Error('登录已过期');
          }
          if (!r.ok) {
            var err = new Error((data && data.error) || ('HTTP ' + r.status));
            err.status = r.status;   // 供 409 冲突等场景读取
            err.data = data;
            throw err;
          }
          return data;
        });
      });
    },
    get: function (p) { return api.req('GET', p); },
    put: function (p, b) { return api.req('PUT', p, b); },
    post: function (p, b) { return api.req('POST', p, b); },
    patch: function (p, b) { return api.req('PATCH', p, b); },
    del: function (p) { return api.req('DELETE', p); },

    login: function (email, password) {
      return api.req('POST', '/api/auth/login', { email: email, password: password })
        .then(function (d) { api.setToken(d.token); api.user = d.user; return d.user; });
    },
    logout: function () { api.setToken(''); location.reload(); },

    // 登录页（仅在线模式且未登录时调用）
    showLogin: function (errMsg) {
      document.body.innerHTML =
        '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;font-family:system-ui,-apple-system,\'Microsoft YaHei\',sans-serif">' +
        '<div style="width:340px;background:#fff;border-radius:14px;padding:28px 26px;box-shadow:0 20px 60px rgba(0,0,0,.4)">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">' +
        '<div style="width:38px;height:38px;border-radius:9px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">AI</div>' +
        '<div><div style="font-weight:700;font-size:15px">外贸全链路系统</div><div style="font-size:12px;color:#64748b">请登录</div></div></div>' +
        (errMsg ? '<div style="background:#fef2f2;color:#dc2626;font-size:13px;padding:8px 10px;border-radius:8px;margin-bottom:12px">' + errMsg + '</div>' : '') +
        '<label style="font-size:12.5px;color:#64748b">邮箱</label>' +
        '<input id="lg-email" style="width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:8px;padding:9px 11px;margin:5px 0 12px;font-size:14px" placeholder="you@company.com">' +
        '<label style="font-size:12.5px;color:#64748b">密码</label>' +
        '<input id="lg-pass" type="password" style="width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:8px;padding:9px 11px;margin:5px 0 16px;font-size:14px" placeholder="密码">' +
        '<button id="lg-btn" style="width:100%;background:#2563eb;color:#fff;border:0;border-radius:8px;padding:11px;font-size:14px;font-weight:600;cursor:pointer">登录</button>' +
        '</div></div>';
      var emailEl = document.getElementById('lg-email');
      var passEl = document.getElementById('lg-pass');
      var btn = document.getElementById('lg-btn');
      function submit() {
        var email = emailEl.value.trim(), pass = passEl.value;
        if (!email || !pass) { api.showLogin('请填写邮箱和密码'); return; }
        btn.disabled = true; btn.textContent = '登录中…';
        api.login(email, pass)
          .then(function () { location.reload(); })
          .catch(function (e) { api.showLogin(e.message || '登录失败'); });
      }
      btn.onclick = submit;
      passEl.onkeydown = function (e) { if (e.key === 'Enter') submit(); };
      emailEl.focus();
    }
  };

  App.api = api;
  App.isLive = function () { return !!api.live; };
})();
