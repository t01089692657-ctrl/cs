/* ============ 模块：管理后台（仅在线模式 + admin 角色可见） ============
 * 员工账号管理（增/改角色/停用/改密/删）+ 操作审计。
 * 演示模式不显示（无后端）。数据全部来自服务器 /api/admin/*。
 */
(function () {
  'use strict';
  var rootEl = null;
  var state = { tab: 'users' };

  var ROLE_LABEL = { admin: '管理员', sales: '销售', ops: '运营' };

  function render(el) {
    rootEl = el;
    el.innerHTML =
      '<div class="mod-admin">' +
      '<div class="notice">管理后台：管理 10 人团队的账号与权限、查看操作审计。数据实时存服务器，全员共享。</div>' +
      '<div class="tabs" id="ad-tabs">' +
      '<div class="tab' + (state.tab === 'users' ? ' active' : '') + '" data-tab="users">员工账号</div>' +
      '<div class="tab' + (state.tab === 'audit' ? ' active' : '') + '" data-tab="audit">操作审计</div>' +
      '</div><div id="ad-body"></div></div>';
    el.querySelectorAll('#ad-tabs .tab').forEach(function (t) {
      t.onclick = function () { state.tab = t.getAttribute('data-tab'); render(rootEl); };
    });
    if (state.tab === 'users') renderUsers(el.querySelector('#ad-body'));
    else renderAudit(el.querySelector('#ad-body'));
  }

  function renderUsers(body) {
    body.innerHTML = '<div class="card">' + App.ui.empty('加载中…', '⏳') + '</div>';
    App.api.get('/api/admin/users').then(function (users) {
      body.innerHTML =
        '<div class="card">' +
        '<div class="card-title"><span>员工账号 <span class="sub">共 ' + users.length + ' 人</span></span>' +
        '<button class="btn btn-primary btn-sm" id="ad-add">＋ 新增员工</button></div>' +
        App.ui.table([
          { key: 'name', label: '姓名', render: function (r) { return '<b>' + App.esc(r.name || '-') + '</b>'; } },
          { key: 'email', label: '邮箱' },
          { key: 'role', label: '角色', render: function (r) { return App.ui.badge(ROLE_LABEL[r.role] || r.role, r.role === 'admin' ? 'accent' : 'gray'); } },
          { key: 'active', label: '状态', render: function (r) { return r.active === false ? App.ui.badge('已停用', 'gray') : App.ui.badge('正常', 'ok'); } },
          {
            key: 'op', label: '操作', render: function (r) {
              return '<button class="btn btn-sm" data-edit="' + App.esc(r.id) + '">编辑</button> ' +
                '<button class="btn btn-sm btn-danger" data-del="' + App.esc(r.id) + '">删除</button>';
            }
          }
        ], users) +
        '</div>';
      body.querySelector('#ad-add').onclick = function () { userModal(null); };
      body.querySelectorAll('[data-edit]').forEach(function (b) {
        b.onclick = function () {
          var u = users.filter(function (x) { return x.id === b.getAttribute('data-edit'); })[0];
          userModal(u);
        };
      });
      body.querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () { delUser(b.getAttribute('data-del')); };
      });
    }).catch(function (e) {
      body.innerHTML = '<div class="card"><div class="muted">加载失败：' + App.esc(e.message) + '</div></div>';
    });
  }

  function userModal(u) {
    var isNew = !u;
    var roles = ['sales', 'ops', 'admin'];
    App.ui.modal(isNew ? '新增员工' : '编辑员工',
      '<div class="row">' +
      '<div class="field" style="flex:1"><label class="field-label">姓名</label>' +
      '<input class="input" id="ad-name" value="' + App.esc(u ? u.name : '') + '"></div>' +
      '<div class="field" style="flex:1"><label class="field-label">邮箱 *</label>' +
      '<input class="input" id="ad-email" value="' + App.esc(u ? u.email : '') + '"' + (isNew ? '' : ' disabled') + '></div>' +
      '</div>' +
      '<div class="row">' +
      '<div class="field" style="flex:1"><label class="field-label">角色</label>' +
      '<select class="select" id="ad-role">' +
      roles.map(function (r) { return '<option value="' + r + '"' + (u && u.role === r ? ' selected' : '') + '>' + ROLE_LABEL[r] + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="field" style="flex:1"><label class="field-label">' + (isNew ? '初始密码 *' : '重置密码（留空不改）') + '</label>' +
      '<input class="input" id="ad-pass" type="password" placeholder="' + (isNew ? '设置初始密码' : '留空则不修改') + '"></div>' +
      '</div>' +
      (isNew ? '' : '<label class="vf-chk"><input type="checkbox" id="ad-active"' + (u.active !== false ? ' checked' : '') + '> 账号启用</label>'),
      '<button class="btn" id="ad-cancel">取消</button>' +
      '<button class="btn btn-primary" id="ad-save">' + (isNew ? '创建' : '保存') + '</button>');

    document.getElementById('ad-cancel').onclick = App.ui.closeModal;
    document.getElementById('ad-save').onclick = function () {
      var name = document.getElementById('ad-name').value.trim();
      var role = document.getElementById('ad-role').value;
      var pass = document.getElementById('ad-pass').value;
      var p;
      if (isNew) {
        var email = document.getElementById('ad-email').value.trim();
        if (!email || !pass) { App.ui.toast('请填写邮箱和初始密码', 'bad'); return; }
        p = App.api.post('/api/admin/users', { email: email, name: name, role: role, password: pass });
      } else {
        var patch = { name: name, role: role, active: document.getElementById('ad-active').checked };
        if (pass) patch.password = pass;
        p = App.api.patch('/api/admin/users/' + u.id, patch);
      }
      p.then(function () {
        App.ui.closeModal();
        App.ui.toast(isNew ? '已新增员工' : '已保存', 'ok');
        render(rootEl);
      }).catch(function (e) { App.ui.toast(e.message, 'bad'); });
    };
  }

  function delUser(id) {
    App.ui.modal('删除员工', '<div class="notice">确定删除该员工账号吗？删除后该员工无法登录。</div>',
      '<button class="btn" id="ad-del-cancel">取消</button><button class="btn btn-danger" id="ad-del-ok">删除</button>');
    document.getElementById('ad-del-cancel').onclick = App.ui.closeModal;
    document.getElementById('ad-del-ok').onclick = function () {
      App.api.del('/api/admin/users/' + id).then(function () {
        App.ui.closeModal(); App.ui.toast('已删除'); render(rootEl);
      }).catch(function (e) { App.ui.toast(e.message, 'bad'); });
    };
  }

  function renderAudit(body) {
    body.innerHTML = '<div class="card">' + App.ui.empty('加载中…', '⏳') + '</div>';
    App.api.get('/api/admin/audit?limit=200').then(function (rows) {
      body.innerHTML = '<div class="card">' +
        '<div class="card-title"><span>操作审计 <span class="sub">最近 ' + rows.length + ' 条</span></span></div>' +
        App.ui.table([
          { key: 'ts', label: '时间', render: function (r) { return '<span class="small">' + App.esc(String(r.ts).replace('T', ' ').slice(0, 19)) + '</span>'; } },
          { key: 'user_email', label: '操作人', render: function (r) { return App.esc(r.user_email || '-'); } },
          { key: 'action', label: '操作', render: function (r) { return App.ui.badge(r.action, 'info'); } },
          { key: 'detail', label: '详情', render: function (r) { return '<span class="small muted">' + App.esc(r.detail ? JSON.stringify(r.detail) : '') + '</span>'; } }
        ], rows, { emptyMsg: '暂无操作记录' }) +
        '</div>';
    }).catch(function (e) {
      body.innerHTML = '<div class="card"><div class="muted">加载失败：' + App.esc(e.message) + '</div></div>';
    });
  }

  App.registerModule({
    id: 'admin',
    adminOnly: true,
    nav: { section: '系统设置', label: '管理后台', icon: '🛡️' },
    render: render
  });
})();
