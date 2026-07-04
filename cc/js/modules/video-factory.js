/* ============ 模块：视频号视频工厂 ============
 * 定位：企业不拍摄、不出镜，用固定模板 + 产品素材批量产出营销视频，投喂视频号。
 * 数据来源：App.data.videoTemplates / App.data.videoQueue / App.data.videoProjects / App.data.products / App.data.kpis
 * 三个页签：模板库（可编辑/新建模板、挂案例视频）| AI 生成向导 | 视频仓库（按项目管理生成的视频）
 * 约定：IIFE 包裹、样式前缀 .mod-video-factory、事件绑定在 innerHTML 之后。
 */
(function () {
  'use strict';

  /* ---------- 模块私有数据 ---------- */
  var SELL_POINTS = ['价格优势', '交期', '保温性能', '卫浴预装', '10年质保', '折叠运输省运费'];
  var SELL_EN = {
    '价格优势': 'Factory-direct pricing',
    '交期': 'Fast lead time',
    '保温性能': 'Superior insulation',
    '卫浴预装': 'Bathroom pre-installed',
    '10年质保': '10-year structural warranty',
    '折叠运输省运费': 'Folding design cuts freight cost'
  };

  /* ---------- 模块私有状态 ---------- */
  var state = { tab: 'tpl', projFilter: 'all' };   // tpl | wiz | queue
  var wiz = newWiz();
  var rootEl = null;

  /* ---------- 生成 API 配置（原型阶段占位，部署服务器后接真实视频生成 API） ---------- */
  var API_STORE = 'vf_api_config_v1';
  function getApiConfig() {
    try { return JSON.parse(localStorage.getItem(API_STORE) || 'null'); } catch (e) { return null; }
  }
  function apiConfigured() {
    var c = getApiConfig();
    return !!(c && c.url);
  }

  /* ---------- 模板持久化（浏览器 localStorage，原型阶段） ----------
   * 用户对模板的编辑/新增/删除保存在本浏览器，刷新不丢；
   * 「恢复出厂模板」可随时回到 core-data.js 里的内置模板。
   */
  var TPL_KEY = 'vf_templates_v1';
  var tplInited = false;
  var factoryTpls = null;   // 内置模板快照（深拷贝，用于恢复出厂）
  var deletedIds = [];      // 用户删除过的内置模板 id（防止刷新后复活）

  function initTemplates() {
    if (tplInited) return;
    tplInited = true;
    factoryTpls = JSON.parse(JSON.stringify(App.data.videoTemplates));
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem(TPL_KEY) || 'null'); } catch (e) { stored = null; }
    // 注意：空数组也是有效的工作副本（用户把模板全删了），只有「从未存过」才用内置数据
    if (!stored || !Array.isArray(stored.templates)) return;
    deletedIds = stored.deleted || [];
    var have = {};
    stored.templates.forEach(function (t) { have[t.id] = true; });
    // 内置模板后续有新增时，自动补进用户的工作副本
    factoryTpls.forEach(function (t) {
      if (!have[t.id] && deletedIds.indexOf(t.id) < 0) stored.templates.push(JSON.parse(JSON.stringify(t)));
    });
    App.data.videoTemplates = stored.templates;
  }

  function saveTemplates() {
    try {
      localStorage.setItem(TPL_KEY, JSON.stringify({ templates: App.data.videoTemplates, deleted: deletedIds }));
    } catch (e) { /* 隐私模式等存储不可用时，修改仅本次会话内有效 */ }
  }

  function newWiz() {
    return { step: 1, templateId: null, productId: null, points: [], lang: '双语', rows: null, projectId: null, newProjName: '' };
  }

  function findProject(id) {
    var list = App.data.videoProjects || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function findTemplate(id) {
    var list = App.data.videoTemplates;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function findProduct(id) {
    var list = App.data.products;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ---------- 入口 ---------- */
  function render(el) {
    rootEl = el;
    initTemplates();
    draw();
  }

  function draw() {
    var q = App.data.videoQueue;
    var pending = q.filter(function (v) { return v.status === '待审核'; }).length;
    var views = 0, leads = 0;
    q.forEach(function (v) { views += (v.views || 0); leads += (v.leads || 0); });

    var tabs = [
      { key: 'tpl', label: '模板库' },
      { key: 'wiz', label: 'AI 生成向导' },
      { key: 'queue', label: '视频仓库' }
    ];

    rootEl.innerHTML =
      '<style>' +
      '.mod-video-factory .vf-tpl{display:flex;flex-direction:column}' +
      '.mod-video-factory .vf-struct{background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin:10px 0;flex:1}' +
      '.mod-video-factory .vf-struct div{font-size:12.5px;color:var(--muted);line-height:1.9}' +
      '.mod-video-factory .vf-choice{border:1px solid var(--line);border-radius:10px;padding:12px 14px;cursor:pointer;transition:all .15s;background:#fff}' +
      '.mod-video-factory .vf-choice:hover{border-color:var(--accent)}' +
      '.mod-video-factory .vf-choice.on{border-color:var(--accent);background:var(--accent-soft);box-shadow:0 0 0 1px var(--accent)}' +
      '.mod-video-factory .vf-chk{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:8px;padding:6px 12px;margin:0 8px 8px 0;cursor:pointer;font-size:13px;background:#fff;user-select:none}' +
      '.mod-video-factory .vf-chk.on{border-color:var(--accent);background:var(--accent-soft);color:var(--accent);font-weight:600}' +
      '.mod-video-factory .vf-ta{width:100%;min-height:54px;border:1px solid var(--line);border-radius:6px;font-size:12.5px;padding:6px 8px;font-family:inherit;resize:vertical;line-height:1.5;color:var(--ink)}' +
      '.mod-video-factory .vf-ta:focus{border-color:var(--accent);outline:none}' +
      '.mod-video-factory .vf-sb td{vertical-align:top}' +
      '.mod-video-factory .vf-videos{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}' +
      '.mod-video-factory .vf-vid-btn{border-color:var(--ok);color:var(--ok);background:var(--ok-soft);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.mod-video-factory .vf-vid-btn:hover{background:var(--ok);color:#fff}' +
      '.mod-video-factory .vf-tpl .card-title{flex-wrap:wrap;gap:4px}' +
      /* 模板编辑弹窗（渲染在 modal-root，样式全局生效，用 .vf-form 前缀隔离） */
      '.vf-form .vf-f-grid{display:grid;grid-template-columns:1fr 140px;gap:10px}' +
      '.vf-form .vf-f-row{display:flex;gap:6px;align-items:center;margin-bottom:6px}' +
      '.vf-form .vf-f-row .input{margin:0}' +
      '.vf-form .vf-f-del{flex-shrink:0;border:1px solid var(--line);background:#fff;border-radius:6px;width:26px;height:26px;line-height:1;cursor:pointer;color:var(--muted);font-size:14px}' +
      '.vf-form .vf-f-del:hover{border-color:var(--bad);color:var(--bad)}' +
      '.vf-form .vf-f-shot{border:1px solid var(--line);border-radius:8px;padding:8px;margin-bottom:8px;background:#f8fafc}' +
      '.vf-form .vf-f-shot .vf-f-row:last-child{margin-bottom:0}' +
      '.vf-form .vf-f-sec{font-size:13px;font-weight:600;margin:14px 0 6px}' +
      '.vf-form .vf-f-sec:first-child{margin-top:0}' +
      '</style>' +
      '<div class="mod-video-factory">' +

      // KPI 行
      '<div class="grid grid-4 mb12">' +
      App.ui.kpi('本周产量', App.data.kpis.videosWeek, '固定模板批量产出') +
      App.ui.kpi('待审核', pending, pending > 0 ? '<span class="text-warn">等待人工审核发布</span>' : '暂无积压') +
      App.ui.kpi('累计播放', App.fmt.num(views), '视频号全部已发布视频') +
      App.ui.kpi('视频带来线索', leads, '<span class="text-ok">进入线索池</span>') +
      '</div>' +

      // Tabs
      '<div class="tabs">' +
      tabs.map(function (t) {
        return '<div class="tab' + (state.tab === t.key ? ' active' : '') + '" data-tab="' + t.key + '">' + t.label + '</div>';
      }).join('') +
      '</div>' +

      '<div id="vf-body"></div>' +

      // 底部 notice
      '<div class="notice mt16">正式版流水线：AI 脚本 → 程序化模板剪辑 → 人工审核 → 定时发布 → 数据回流优化选题。' +
      '当前为演示环境，合成与发布动作仅做流程演示，不产生真实视频文件。</div>' +

      '</div>';

    // Tab 切换事件
    rootEl.querySelectorAll('.mod-video-factory .tab').forEach(function (t) {
      t.onclick = function () {
        state.tab = t.getAttribute('data-tab');
        draw();
      };
    });

    drawBody();
  }

  function drawBody() {
    var body = rootEl.querySelector('#vf-body');
    if (state.tab === 'tpl') drawTemplates(body);
    else if (state.tab === 'wiz') drawWizard(body);
    else drawQueue(body);
  }

  /* ================= Tab 1：模板库 ================= */
  function drawTemplates(body) {
    var tpls = App.data.videoTemplates;
    body.innerHTML =
      '<div class="row-between mb12">' +
      '<span class="small muted">共 ' + tpls.length + ' 个模板 · 名称/分镜/案例视频均可自行修改，保存在本浏览器</span>' +
      '<div class="row">' +
      '<button class="btn btn-sm" id="vf-tpl-reset">恢复出厂模板</button>' +
      '<button class="btn btn-sm btn-primary" id="vf-tpl-add">＋ 新建模板</button>' +
      '</div>' +
      '</div>' +
      '<div class="grid grid-2">' +
      tpls.map(function (t) {
        var vids = t.videos || [];
        return '<div class="card mb0 vf-tpl">' +
          '<div class="card-title">' + App.esc(t.name) + App.ui.badge(t.duration, 'accent') +
          (t.custom ? ' ' + App.ui.badge('自定义', 'purple') : '') + '</div>' +
          '<div class="small muted">适用：' + App.esc(t.bestFor) + '</div>' +
          '<div class="vf-struct">' +
          t.structure.map(function (s, i) {
            return '<div>' + (i + 1) + '. ' + App.esc(s) + '</div>';
          }).join('') +
          '</div>' +
          '<div class="vf-videos">' +
          (vids.length
            ? vids.map(function (v, vi) {
                return '<button class="btn btn-sm vf-vid-btn" data-act="video" data-id="' + App.esc(t.id) + '" data-vi="' + vi + '">▶ ' +
                  App.esc(v.title || '案例视频 ' + (vi + 1)) + '</button>';
              }).join('')
            : '<button class="btn btn-sm btn-ghost" data-act="edit" data-id="' + App.esc(t.id) + '">＋ 添加案例视频</button>') +
          '</div>' +
          '<div class="row">' +
          '<button class="btn btn-sm" data-act="sample" data-id="' + App.esc(t.id) + '">查看示例分镜</button>' +
          '<button class="btn btn-sm btn-primary" data-act="use" data-id="' + App.esc(t.id) + '">用此模板生成</button>' +
          '<span style="flex:1"></span>' +
          '<button class="btn btn-sm" data-act="edit" data-id="' + App.esc(t.id) + '">编辑</button>' +
          '<button class="btn btn-sm btn-danger" data-act="del" data-id="' + App.esc(t.id) + '">删除</button>' +
          '</div>' +
          '</div>';
      }).join('') +
      '</div>';

    var addBtn = body.querySelector('#vf-tpl-add');
    if (addBtn) addBtn.onclick = function () { editTemplateModal(null); };
    var resetBtn = body.querySelector('#vf-tpl-reset');
    if (resetBtn) resetBtn.onclick = resetTemplates;

    body.querySelectorAll('button[data-act]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-id');
        var act = b.getAttribute('data-act');
        if (act === 'sample') showSampleModal(id);
        else if (act === 'use') useTemplate(id);
        else if (act === 'edit') editTemplateModal(id);
        else if (act === 'del') deleteTemplate(id);
        else if (act === 'video') showVideoModal(id, parseInt(b.getAttribute('data-vi'), 10));
      };
    });
  }

  /* ---- 恢复出厂模板 ---- */
  function resetTemplates() {
    App.ui.modal(
      '恢复出厂模板',
      '<div class="notice">将丢弃你对模板的全部修改、新增和删除，恢复为系统内置的 ' + factoryTpls.length + ' 个模板。此操作不可撤销，确定继续吗？</div>',
      '<button class="btn" id="vf-reset-cancel">取消</button>' +
      '<button class="btn btn-danger" id="vf-reset-ok">恢复出厂</button>'
    );
    document.getElementById('vf-reset-cancel').onclick = App.ui.closeModal;
    document.getElementById('vf-reset-ok').onclick = function () {
      App.data.videoTemplates = JSON.parse(JSON.stringify(factoryTpls));
      deletedIds = [];
      try { localStorage.removeItem(TPL_KEY); } catch (e) {}
      App.ui.closeModal();
      drawBody();
      App.ui.toast('已恢复出厂模板', 'ok');
    };
  }

  /* ---- 删除模板 ---- */
  function deleteTemplate(id) {
    var t = findTemplate(id);
    if (!t) return;
    App.ui.modal(
      '删除模板',
      '<div class="notice">确定删除模板「' + App.esc(t.name) + '」吗？' +
      (t.custom ? '自定义模板删除后无法找回。' : '内置模板删除后，可通过「恢复出厂模板」找回。') + '</div>',
      '<button class="btn" id="vf-del-cancel">取消</button>' +
      '<button class="btn btn-danger" id="vf-del-ok">删除</button>'
    );
    document.getElementById('vf-del-cancel').onclick = App.ui.closeModal;
    document.getElementById('vf-del-ok').onclick = function () {
      var list = App.data.videoTemplates;
      var i = list.indexOf(t);
      if (i >= 0) list.splice(i, 1);
      if (!t.custom && deletedIds.indexOf(id) < 0) deletedIds.push(id);
      if (wiz.templateId === id) { wiz.templateId = null; wiz.rows = null; } // 向导若选中该模板则重置
      saveTemplates();
      App.ui.closeModal();
      drawBody();
      App.ui.toast('已删除模板「' + t.name + '」');
    };
  }

  /* ---- 案例视频播放 ---- */
  function isDirectVideo(url) {
    return /\.(mp4|webm|ogv|ogg|mov|m4v)(\?[^#]*)?(#.*)?$/i.test(String(url || ''));
  }

  function showVideoModal(tplId, vi) {
    var t = findTemplate(tplId);
    if (!t || !t.videos || !t.videos[vi]) return;
    var v = t.videos[vi];
    var inner;
    if (isDirectVideo(v.url)) {
      inner = '<video controls preload="metadata" style="width:100%;max-height:62vh;background:#000;border-radius:8px;display:block" src="' + App.esc(v.url) + '"></video>' +
        '<div class="small muted mt8">无法播放？请检查链接是否为视频直链（mp4/webm 等），以及当前网络能否访问该地址。</div>';
    } else {
      inner = '<div class="notice">该链接不是视频直链，将在新窗口打开观看：</div>' +
        '<div class="small muted mt8" style="word-break:break-all">' + App.esc(v.url) + '</div>' +
        '<div class="mt8"><a class="btn btn-primary" href="' + App.esc(v.url) + '" target="_blank" rel="noopener">↗ 打开链接观看</a></div>';
    }
    App.ui.modal(
      '案例视频 · ' + (v.title || t.name),
      inner,
      '<button class="btn" id="vf-vid-close">关闭</button>',
      { large: true }
    );
    document.getElementById('vf-vid-close').onclick = App.ui.closeModal;
  }

  /* ---- 新建 / 编辑模板弹窗 ---- */
  function editTemplateModal(id) {
    var isNew = !id;
    var orig = isNew ? null : findTemplate(id);
    if (!isNew && !orig) return;
    // 编辑操作全部作用在草稿上，点「保存」才写回
    var draft = isNew
      ? { name: '', duration: '30-45秒', bestFor: '', structure: [], sample: [], videos: [], custom: true }
      : JSON.parse(JSON.stringify(orig));
    if (!draft.sample) draft.sample = [];
    if (!draft.videos) draft.videos = [];

    App.ui.modal(
      isNew ? '新建模板' : '编辑模板 · ' + orig.name,
      '<div class="vf-form">' +

      '<div class="vf-f-sec">基本信息</div>' +
      '<div class="vf-f-grid mb8">' +
      '<div><label class="field-label">模板名称 *</label>' +
      '<input class="input" id="vf-f-name" placeholder="例如：门店探访型" value="' + App.esc(draft.name) + '"></div>' +
      '<div><label class="field-label">时长</label>' +
      '<input class="input" id="vf-f-duration" placeholder="例如：30-45秒" value="' + App.esc(draft.duration) + '"></div>' +
      '</div>' +
      '<div><label class="field-label">适用说明</label>' +
      '<input class="input" id="vf-f-bestfor" placeholder="这个模板适合什么场景、什么受众" value="' + App.esc(draft.bestFor) + '"></div>' +

      '<div class="vf-f-sec">分镜结构（每行一条，按时间顺序）</div>' +
      '<textarea class="textarea" id="vf-f-struct" rows="5" placeholder="例如：\n0-3s 钩子：…\n3-15s …\n15-30s 行动号召：…">' +
      App.esc((draft.structure || []).join('\n')) + '</textarea>' +

      '<div class="vf-f-sec">示例分镜（选填，AI 生成脚本时作为底稿）</div>' +
      '<div id="vf-f-sample"></div>' +
      '<button class="btn btn-sm" id="vf-f-sample-add">＋ 添加分镜</button>' +

      '<div class="vf-f-sec">案例视频（展示在模板卡片上，供别人点击观看）</div>' +
      '<div id="vf-f-videos"></div>' +
      '<button class="btn btn-sm" id="vf-f-video-add">＋ 添加案例视频</button>' +
      '<div class="small muted mt8">支持视频直链（mp4/webm 等，可直接在弹窗播放）或普通链接（视频号/YouTube 等，跳转观看）。' +
      '本地部署时也可填相对路径，如 视频/案例1.mp4。</div>' +

      '</div>',
      '<button class="btn" id="vf-f-cancel">取消</button>' +
      '<button class="btn btn-primary" id="vf-f-save">' + (isNew ? '创建模板' : '保存修改') + '</button>',
      { large: true }
    );

    /* -- 示例分镜行 -- */
    var sampleBox = document.getElementById('vf-f-sample');
    function renderSampleRows() {
      sampleBox.innerHTML = draft.sample.map(function (s, i) {
        return '<div class="vf-f-shot">' +
          '<div class="vf-f-row">' +
          '<input class="input" style="width:110px;flex:none" data-si="' + i + '" data-sf="shot" placeholder="镜头" value="' + App.esc(s.shot) + '">' +
          '<input class="input" style="flex:1" data-si="' + i + '" data-sf="visual" placeholder="画面内容" value="' + App.esc(s.visual) + '">' +
          '<button class="vf-f-del" data-sdel="' + i + '" title="删除这组分镜">✕</button>' +
          '</div>' +
          '<div class="vf-f-row">' +
          '<input class="input" style="flex:1" data-si="' + i + '" data-sf="zh" placeholder="中文字幕" value="' + App.esc(s.zh) + '">' +
          '<input class="input" style="flex:1" data-si="' + i + '" data-sf="en" placeholder="英文字幕" value="' + App.esc(s.en) + '">' +
          '<input class="input" style="flex:1" data-si="' + i + '" data-sf="vo" placeholder="配音口播" value="' + App.esc(s.vo) + '">' +
          '</div>' +
          '</div>';
      }).join('') || '<div class="small muted mb8">暂无示例分镜。不填时，AI 生成向导会按上方「分镜结构」逐行生成底稿。</div>';

      sampleBox.querySelectorAll('input[data-si]').forEach(function (inp) {
        inp.oninput = function () {
          draft.sample[parseInt(inp.getAttribute('data-si'), 10)][inp.getAttribute('data-sf')] = inp.value;
        };
      });
      sampleBox.querySelectorAll('button[data-sdel]').forEach(function (btn) {
        btn.onclick = function () {
          draft.sample.splice(parseInt(btn.getAttribute('data-sdel'), 10), 1);
          renderSampleRows();
        };
      });
    }
    renderSampleRows();
    document.getElementById('vf-f-sample-add').onclick = function () {
      draft.sample.push({ shot: '', visual: '', zh: '', en: '', vo: '' });
      renderSampleRows();
      var inputs = sampleBox.querySelectorAll('input[data-sf="shot"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    };

    /* -- 案例视频行 -- */
    var videoBox = document.getElementById('vf-f-videos');
    function renderVideoRows() {
      videoBox.innerHTML = draft.videos.map(function (v, i) {
        return '<div class="vf-f-row">' +
          '<input class="input" style="width:170px;flex:none" data-vi="' + i + '" data-vf="title" placeholder="视频标题" value="' + App.esc(v.title) + '">' +
          '<input class="input" style="flex:1" data-vi="' + i + '" data-vf="url" placeholder="视频链接（mp4 直链或网页链接）" value="' + App.esc(v.url) + '">' +
          '<button class="vf-f-del" data-vdel="' + i + '" title="删除该视频">✕</button>' +
          '</div>';
      }).join('') || '<div class="small muted mb8">暂无案例视频。</div>';

      videoBox.querySelectorAll('input[data-vi]').forEach(function (inp) {
        inp.oninput = function () {
          draft.videos[parseInt(inp.getAttribute('data-vi'), 10)][inp.getAttribute('data-vf')] = inp.value;
        };
      });
      videoBox.querySelectorAll('button[data-vdel]').forEach(function (btn) {
        btn.onclick = function () {
          draft.videos.splice(parseInt(btn.getAttribute('data-vdel'), 10), 1);
          renderVideoRows();
        };
      });
    }
    renderVideoRows();
    document.getElementById('vf-f-video-add').onclick = function () {
      draft.videos.push({ title: '', url: '' });
      renderVideoRows();
      var inputs = videoBox.querySelectorAll('input[data-vf="title"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    };

    /* -- 取消 / 保存 -- */
    document.getElementById('vf-f-cancel').onclick = App.ui.closeModal;
    document.getElementById('vf-f-save').onclick = function () {
      var name = document.getElementById('vf-f-name').value.trim();
      if (!name) { App.ui.toast('请填写模板名称', 'bad'); return; }
      var structure = document.getElementById('vf-f-struct').value
        .split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!structure.length) { App.ui.toast('请至少填写一行分镜结构', 'bad'); return; }

      draft.name = name;
      draft.duration = document.getElementById('vf-f-duration').value.trim() || '30-45秒';
      draft.bestFor = document.getElementById('vf-f-bestfor').value.trim();
      draft.structure = structure;
      // 丢弃全空的分镜行和没有链接的视频行
      draft.sample = draft.sample.filter(function (s) {
        return (s.shot + s.visual + s.zh + s.en + s.vo).trim() !== '';
      });
      draft.videos = draft.videos.filter(function (v) { return v.url.trim() !== ''; })
        .map(function (v) { return { title: v.title.trim(), url: v.url.trim() }; });

      if (isNew) {
        draft.id = 'vtc' + Date.now();
        App.data.videoTemplates.push(draft);
      } else {
        // 写回原对象，保持数组顺序与引用
        Object.keys(draft).forEach(function (k) { orig[k] = draft[k]; });
      }
      saveTemplates();
      App.ui.closeModal();
      drawBody();
      App.ui.toast(isNew ? '已创建模板「' + name + '」' : '已保存「' + name + '」', 'ok');
    };
  }

  function useTemplate(id) {
    var t = findTemplate(id);
    if (!t) return;
    wiz = newWiz();
    wiz.templateId = id;
    state.tab = 'wiz';
    draw();
    App.ui.toast('已选择模板「' + t.name + '」，请继续完成向导');
  }

  function showSampleModal(id) {
    var t = findTemplate(id);
    if (!t) return;
    var tableHtml = (!t.sample || !t.sample.length)
      ? App.ui.empty('该模板还没有示例分镜，点「编辑模板」添加', '🎬')
      : '<div style="overflow-x:auto">' + App.ui.table([
      { key: 'shot', label: '镜头', width: '70px', render: function (r) { return '<b>' + App.esc(r.shot) + '</b>'; } },
      { key: 'visual', label: '画面', render: function (r) { return App.esc(r.visual); } },
      { key: 'zh', label: '中文字幕', render: function (r) { return App.esc(r.zh) || '-'; } },
      { key: 'en', label: '英文字幕', render: function (r) { return '<span class="small">' + App.esc(r.en) + '</span>'; } },
      { key: 'vo', label: '配音', render: function (r) { return r.vo ? App.esc(r.vo) : '<span class="muted">-</span>'; } }
    ], t.sample) + '</div>';

    App.ui.modal(
      t.name + ' · 示例分镜',
      '<div class="small muted mb8">时长 ' + App.esc(t.duration) + ' · ' + App.esc(t.bestFor) + '</div>' + tableHtml,
      '<button class="btn" id="vf-modal-close">关闭</button>' +
      '<button class="btn" id="vf-modal-edit">编辑模板</button>' +
      '<button class="btn btn-primary" id="vf-modal-use">用此模板生成</button>',
      { large: true }
    );
    document.getElementById('vf-modal-close').onclick = App.ui.closeModal;
    document.getElementById('vf-modal-edit').onclick = function () {
      App.ui.closeModal();
      editTemplateModal(id);
    };
    document.getElementById('vf-modal-use').onclick = function () {
      App.ui.closeModal();
      useTemplate(id);
    };
  }

  /* ================= Tab 2：AI 生成向导 ================= */
  function stepsBar(cur) {
    var labels = ['选模板', '选产品与卖点', 'AI 生成脚本', '提交合成'];
    return '<div class="steps">' +
      labels.map(function (lb, i) {
        var n = i + 1;
        var cls = n === cur ? 'step active' : (n < cur ? 'step done' : 'step');
        var dot = n < cur ? '✓' : n;
        return '<div class="' + cls + '"><span class="step-dot">' + dot + '</span>' + lb + '</div>' +
          (n < labels.length ? '<div class="step-line"></div>' : '');
      }).join('') +
      '</div>';
  }

  function drawWizard(body) {
    var html = '<div class="card mb0">' + stepsBar(wiz.step);

    if (wiz.step === 1) html += wizStep1Html();
    else if (wiz.step === 2) html += wizStep2Html();
    else if (wiz.step === 3) html += wizStep3Html();
    else html += wizStep4Html();

    html += '</div>';
    body.innerHTML = html;
    bindWizardEvents(body);
  }

  /* ---- 第①步：选模板 ---- */
  function wizStep1Html() {
    return '<div class="small muted mb12">第一步：选择一个视频模板（单选）</div>' +
      '<div class="grid grid-2">' +
      App.data.videoTemplates.map(function (t) {
        var on = wiz.templateId === t.id;
        return '<div class="vf-choice' + (on ? ' on' : '') + '" data-tid="' + App.esc(t.id) + '">' +
          '<div class="row-between"><b>' + App.esc(t.name) + '</b>' + App.ui.badge(t.duration, on ? 'accent' : 'gray') + '</div>' +
          '<div class="small muted mt8">' + App.esc(t.bestFor) + '</div>' +
          '</div>';
      }).join('') +
      '</div>' +
      '<div class="row mt16" style="justify-content:flex-end">' +
      '<button class="btn btn-primary" id="vf-next-1">下一步：选产品与卖点 →</button>' +
      '</div>';
  }

  /* ---- 第②步：选产品 + 卖点 + 字幕语言 ---- */
  function wizStep2Html() {
    var langs = ['中文', '英文', '双语'];
    return '<div class="small muted mb12">第二步：选择产品（单选）、勾选要突出的卖点、选择字幕语言</div>' +

      '<div class="field-label">产品（图片在「知识库与配置 → 产品知识库」维护，将作为视频素材与封面）</div>' +
      '<div class="grid grid-2 mb12">' +
      App.data.products.map(function (p) {
        var on = wiz.productId === p.id;
        var price = p.priceMin != null ? App.fmt.money(p.priceMin) + ' – ' + App.fmt.money(p.priceMax) : '按图报价';
        var cover = (p.images && p.images[0])
          ? '<img src="' + p.images[0] + '" alt="" style="width:72px;height:54px;object-fit:cover;border-radius:8px;flex-shrink:0">'
          : '<div style="width:72px;height:54px;border-radius:8px;background:#f1f3f7;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📦</div>';
        return '<div class="vf-choice' + (on ? ' on' : '') + '" data-pid="' + App.esc(p.id) + '">' +
          '<div class="row" style="align-items:flex-start">' + cover +
          '<div style="flex:1;min-width:0">' +
          '<div class="row-between"><b>' + App.esc(p.name) + '</b>' + App.ui.badge(p.tagline, on ? 'accent' : 'gray') + '</div>' +
          '<div class="small muted mt8">' + price + ' · ' + App.esc(p.leadTime) +
          (p.images && p.images.length ? ' · 图片 ' + p.images.length + ' 张' : ' · <span class="text-warn">暂无图片</span>') + '</div>' +
          '</div></div>' +
          '</div>';
      }).join('') +
      '<div class="vf-choice" id="vf-prod-add" style="display:flex;align-items:center;justify-content:center;min-height:78px;color:var(--accent);font-weight:600">＋ 新增产品（上传产品图片）</div>' +
      '</div>' +

      '<div class="field-label">突出卖点（可多选）</div>' +
      '<div class="mb12">' +
      SELL_POINTS.map(function (sp) {
        var on = wiz.points.indexOf(sp) >= 0;
        return '<label class="vf-chk' + (on ? ' on' : '') + '" data-sp="' + App.esc(sp) + '">' +
          '<input type="checkbox" ' + (on ? 'checked' : '') + ' style="accent-color:var(--accent)"> ' + App.esc(sp) +
          '</label>';
      }).join('') +
      '</div>' +

      '<div class="field" style="max-width:220px">' +
      '<label class="field-label">字幕语言</label>' +
      '<select class="select" id="vf-lang">' +
      langs.map(function (l) {
        return '<option value="' + l + '"' + (wiz.lang === l ? ' selected' : '') + '>' + l + '</option>';
      }).join('') +
      '</select>' +
      '</div>' +

      '<div class="row mt16" style="justify-content:space-between">' +
      '<button class="btn" id="vf-prev-2">← 上一步</button>' +
      '<button class="btn btn-primary" id="vf-next-2">下一步：AI 生成脚本 →</button>' +
      '</div>';
  }

  /* ---- 第③步：AI 生成脚本 ---- */
  function wizStep3Html() {
    var t = findTemplate(wiz.templateId);
    var p = findProduct(wiz.productId);
    return '<div class="row-between mb12">' +
      '<div class="small muted">第三步：基于「' + App.esc(t ? t.name : '') + '」为 ' + App.esc(p ? p.name : '') + ' 生成分镜脚本</div>' +
      '<span class="badge badge-purple">可直接修改，AI 生成仅供起点</span>' +
      '</div>' +
      '<div class="row mb12">' +
      '<button class="btn btn-primary" id="vf-gen">✨ AI 生成脚本</button>' +
      (wiz.rows ? '<span class="small muted">已生成 ' + wiz.rows.length + ' 组分镜，可在下方直接编辑字幕</span>' : '') +
      '</div>' +
      '<div id="vf-gen-box">' + (wiz.rows ? '<div id="vf-sb"></div>' : App.ui.empty('点击上方按钮，AI 将基于模板结构与产品资料生成分镜脚本', '🎬')) + '</div>' +
      '<div class="row mt16" style="justify-content:space-between">' +
      '<button class="btn" id="vf-prev-3">← 上一步</button>' +
      '<button class="btn btn-primary" id="vf-next-3">下一步：提交合成 →</button>' +
      '</div>';
  }

  /* ---- 第④步：提交合成 ---- */
  function wizStep4Html() {
    var t = findTemplate(wiz.templateId);
    var p = findProduct(wiz.productId);
    var title = (p ? p.name : '') + ' · ' + (t ? t.name : '');
    var projects = App.data.videoProjects || [];
    if (!wiz.projectId) wiz.projectId = projects.length ? projects[0].id : '__new';
    var cover = (p && p.images && p.images[0])
      ? '<img src="' + p.images[0] + '" alt="" style="width:120px;height:90px;object-fit:cover;border-radius:8px">'
      : '<span class="muted small">产品暂无图片，封面待生成</span>';
    return '<div class="small muted mb12">第四步：确认信息、选择归属项目并提交合成</div>' +
      '<div class="ai-box mb12">' +
      '<dl class="kv">' +
      '<dt>视频标题</dt><dd><b>' + App.esc(title) + '</b></dd>' +
      '<dt>模板</dt><dd>' + App.esc(t ? t.name + '（' + t.duration + '）' : '-') + '</dd>' +
      '<dt>产品</dt><dd>' + App.esc(p ? p.name : '-') + '</dd>' +
      '<dt>封面预览</dt><dd>' + cover + '</dd>' +
      '<dt>突出卖点</dt><dd>' + (wiz.points.length ? wiz.points.map(function (sp) { return App.ui.badge(sp, 'accent'); }).join(' ') : '<span class="muted">未勾选</span>') + '</dd>' +
      '<dt>字幕语言</dt><dd>' + App.esc(wiz.lang) + '</dd>' +
      '<dt>分镜数</dt><dd>' + (wiz.rows ? wiz.rows.length + ' 组' : '-') + '</dd>' +
      '</dl>' +
      '</div>' +
      '<div class="field" style="max-width:340px">' +
      '<label class="field-label">归属项目（在「视频仓库」中按项目管理）</label>' +
      '<select class="select" id="vf-proj">' +
      projects.map(function (pj) {
        return '<option value="' + App.esc(pj.id) + '"' + (wiz.projectId === pj.id ? ' selected' : '') + '>' + App.esc(pj.name) + '</option>';
      }).join('') +
      '<option value="__new"' + (wiz.projectId === '__new' ? ' selected' : '') + '>＋ 新建项目…</option>' +
      '</select>' +
      '<input class="input mt8" id="vf-proj-new" placeholder="输入新项目名称" value="' + App.esc(wiz.newProjName) + '"' +
      (wiz.projectId === '__new' ? '' : ' style="display:none"') + '>' +
      '</div>' +
      '<div class="notice">提交后视频进入合成队列，状态为「待审核」，人工审核通过后才会发布到视频号。' +
      (apiConfigured() ? '' : ' 当前未配置生成 API（可在「视频仓库」右上角配置），提交仅做演示，不产生真实视频文件。') + '</div>' +
      '<div class="row mt16" style="justify-content:space-between">' +
      '<button class="btn" id="vf-prev-4">← 上一步</button>' +
      '<button class="btn btn-ok" id="vf-submit">🚀 提交合成</button>' +
      '</div>';
  }

  /* ---- 向导事件绑定 ---- */
  function bindWizardEvents(body) {
    // 第①步
    body.querySelectorAll('[data-tid]').forEach(function (c) {
      c.onclick = function () {
        wiz.templateId = c.getAttribute('data-tid');
        drawBody();
      };
    });
    var next1 = body.querySelector('#vf-next-1');
    if (next1) next1.onclick = function () {
      if (!findTemplate(wiz.templateId)) { App.ui.toast('请先选择一个模板', 'bad'); return; }
      wiz.step = 2; drawBody();
    };

    // 第②步
    body.querySelectorAll('[data-pid]').forEach(function (c) {
      c.onclick = function () {
        wiz.productId = c.getAttribute('data-pid');
        wiz.rows = null; // 换产品后旧脚本作废
        drawBody();
      };
    });
    var prodAdd = body.querySelector('#vf-prod-add');
    if (prodAdd) prodAdd.onclick = function () {
      if (!App.openProductEditor) return;
      App.openProductEditor(null, function (saved) {
        wiz.productId = saved.id;   // 新建后自动选中
        wiz.rows = null;
        drawBody();
      });
    };
    body.querySelectorAll('.vf-chk').forEach(function (lb) {
      var sp = lb.getAttribute('data-sp');
      var cb = lb.querySelector('input');
      cb.onchange = function () {
        var i = wiz.points.indexOf(sp);
        if (cb.checked && i < 0) wiz.points.push(sp);
        if (!cb.checked && i >= 0) wiz.points.splice(i, 1);
        lb.classList.toggle('on', cb.checked);
        wiz.rows = null;
      };
    });
    var langSel = body.querySelector('#vf-lang');
    if (langSel) langSel.onchange = function () { wiz.lang = langSel.value; wiz.rows = null; };
    var prev2 = body.querySelector('#vf-prev-2');
    if (prev2) prev2.onclick = function () { wiz.step = 1; drawBody(); };
    var next2 = body.querySelector('#vf-next-2');
    if (next2) next2.onclick = function () {
      if (!findProduct(wiz.productId)) { App.ui.toast('请先选择一个产品', 'bad'); return; }
      wiz.step = 3; drawBody();
    };

    // 第③步
    var genBtn = body.querySelector('#vf-gen');
    if (genBtn) genBtn.onclick = function () { generateScript(genBtn); };
    if (wiz.rows && body.querySelector('#vf-sb')) renderStoryboard(body.querySelector('#vf-sb'));
    var prev3 = body.querySelector('#vf-prev-3');
    if (prev3) prev3.onclick = function () { wiz.step = 2; drawBody(); };
    var next3 = body.querySelector('#vf-next-3');
    if (next3) next3.onclick = function () {
      if (!wiz.rows) { App.ui.toast('请先点击「AI 生成脚本」', 'bad'); return; }
      wiz.step = 4; drawBody();
    };

    // 第④步
    var prev4 = body.querySelector('#vf-prev-4');
    if (prev4) prev4.onclick = function () { wiz.step = 3; drawBody(); };
    var projSel = body.querySelector('#vf-proj');
    if (projSel) projSel.onchange = function () {
      wiz.projectId = projSel.value;
      var inp = body.querySelector('#vf-proj-new');
      if (inp) inp.style.display = projSel.value === '__new' ? '' : 'none';
    };
    var projNew = body.querySelector('#vf-proj-new');
    if (projNew) projNew.oninput = function () { wiz.newProjName = projNew.value; };
    var submit = body.querySelector('#vf-submit');
    if (submit) submit.onclick = submitVideo;
  }

  /* ---- AI 脚本生成 ---- */
  function adaptText(text, p) {
    if (!text) return '';
    var t = String(text);
    // 替换带千分位的产品价格（$8,500 之类），不动 $120/晚 这类小数字
    if (p.priceMin != null) {
      t = t.replace(/\$\d{1,3}(?:,\d{3})+/g, App.fmt.money(p.priceMin));
    }
    // 替换产品型号
    t = t.replace(/EH-20|EH-40|FD-13|CH-P/g, p.id);
    // 替换面积（36㎡ → 所选产品面积）
    var m = String(p.area || '').match(/([\d.]+)\s*㎡/);
    if (m) t = t.replace(/\d+(?:\.\d+)?㎡/g, m[1] + '㎡');
    return t;
  }

  function buildRows() {
    var t = findTemplate(wiz.templateId);
    var p = findProduct(wiz.productId);
    if (!t || !p) return null;
    // 模板没填示例分镜时，按分镜结构逐行生成底稿
    var sample = (t.sample && t.sample.length) ? t.sample :
      (t.structure || []).map(function (s, i) {
        return { shot: '镜头' + (i + 1), visual: s, zh: '', en: '', vo: '' };
      });
    var rows = sample.map(function (s) {
      return {
        shot: s.shot,
        visual: adaptText(s.visual, p),
        zh: adaptText(s.zh, p),
        en: adaptText(s.en, p),
        vo: adaptText(s.vo, p)
      };
    });
    // 有勾选卖点时，在落版镜头前插入一组卖点强化分镜
    if (wiz.points.length) {
      rows.splice(rows.length - 1, 0, {
        shot: '卖点强化',
        visual: p.id + ' 产品素材 + 动态字幕卡',
        zh: wiz.points.join(' · '),
        en: wiz.points.map(function (sp) { return SELL_EN[sp] || sp; }).join('. '),
        vo: 'AI配音：' + wiz.points.join('、')
      });
    }
    return rows;
  }

  async function generateScript(btn) {
    var box = rootEl.querySelector('#vf-gen-box');
    if (!box) return;
    var t = findTemplate(wiz.templateId);
    var p = findProduct(wiz.productId);
    btn.disabled = true;
    box.innerHTML = '';
    var stop = App.ai.thinking(box, '正在解析「' + (t ? t.name : '') + '」模板结构，套入 ' + (p ? p.name : '') + ' 的产品资料与卖点…');
    await App.ai.delay(1600);
    stop();
    btn.disabled = false;
    // 等待期间用户切走了页签/模块：放弃本次生成，避免结果写进已卸载的界面
    if (!document.contains(box)) return;

    wiz.rows = buildRows();
    if (!wiz.rows) { App.ui.toast('生成失败：模板或产品数据缺失', 'bad'); return; }

    box.innerHTML =
      '<div class="ai-box mb12"><div class="row" style="gap:8px;align-items:flex-start">' +
      '<span class="ai-tag">AI</span><span class="small" id="vf-gen-note" style="line-height:1.7"></span>' +
      '</div></div>' +
      '<div id="vf-sb"></div>';

    var note = '已基于「' + (t ? t.name : '') + '」为 ' + (p ? p.name : '') + ' 生成 ' + wiz.rows.length +
      ' 组分镜，字幕语言：' + wiz.lang +
      (p && p.images && p.images.length ? '，将调用产品图片 ' + p.images.length + ' 张作为画面素材' : '，该产品暂无图片，建议先到产品库上传实拍图') +
      (wiz.points.length ? '，已融入卖点：' + wiz.points.join('、') : '') +
      '。字幕单元格可直接编辑，改完进入下一步提交合成。';
    await App.ai.typeInto(box.querySelector('#vf-gen-note'), note);
    renderStoryboard(box.querySelector('#vf-sb'));
  }

  function renderStoryboard(container) {
    if (!container || !wiz.rows) return;
    var showZh = wiz.lang !== '英文';
    var showEn = wiz.lang !== '中文';

    var h = '<div style="overflow-x:auto"><table class="tbl vf-sb"><thead><tr>' +
      '<th style="width:80px">镜头</th><th>画面</th>' +
      (showZh ? '<th style="width:22%">中文字幕</th>' : '') +
      (showEn ? '<th style="width:24%">英文字幕</th>' : '') +
      '<th style="width:18%">配音</th>' +
      '</tr></thead><tbody>';

    wiz.rows.forEach(function (r, i) {
      h += '<tr>' +
        '<td><b>' + App.esc(r.shot) + '</b></td>' +
        '<td><span class="small">' + App.esc(r.visual) + '</span></td>' +
        (showZh ? '<td><textarea class="vf-ta" data-idx="' + i + '" data-field="zh">' + App.esc(r.zh) + '</textarea></td>' : '') +
        (showEn ? '<td><textarea class="vf-ta" data-idx="' + i + '" data-field="en">' + App.esc(r.en) + '</textarea></td>' : '') +
        '<td><span class="small muted">' + (r.vo ? App.esc(r.vo) : '-') + '</span></td>' +
        '</tr>';
    });
    h += '</tbody></table></div>';
    container.innerHTML = h;

    container.querySelectorAll('.vf-ta').forEach(function (ta) {
      ta.oninput = function () {
        var idx = parseInt(ta.getAttribute('data-idx'), 10);
        var field = ta.getAttribute('data-field');
        if (wiz.rows && wiz.rows[idx]) wiz.rows[idx][field] = ta.value;
      };
    });
  }

  /* ---- 提交合成 ---- */
  function submitVideo() {
    var t = findTemplate(wiz.templateId);
    var p = findProduct(wiz.productId);
    if (!t || !p || !wiz.rows) { App.ui.toast('信息不完整，无法提交', 'bad'); return; }

    // 归属项目：选了「新建项目」则先创建
    var projectId = wiz.projectId;
    if (projectId === '__new') {
      var name = (wiz.newProjName || '').trim();
      if (!name) { App.ui.toast('请填写新项目名称', 'bad'); return; }
      var proj = { id: 'vp' + Date.now(), name: name };
      App.data.videoProjects.push(proj);
      projectId = proj.id;
    }

    App.data.videoQueue.unshift({
      id: 'v' + Date.now(),
      title: p.name + ' · ' + t.name,
      template: t.name,
      project: projectId,
      product: p.id,
      cover: (p.images && p.images[0]) || null,
      rows: wiz.rows,
      lang: wiz.lang,
      status: '待审核',
      date: '今天',
      views: 0,
      likes: 0,
      leads: 0
    });
    App.persist();
    wiz = newWiz();
    state.tab = 'queue';
    state.projFilter = projectId;
    draw();
    App.ui.toast(apiConfigured()
      ? '已提交合成，完成后进入待审核'
      : '已进入合成队列（未配置生成 API，当前为演示模式）', 'ok');
  }

  /* ================= Tab 3：视频仓库 ================= */
  function drawQueue(body) {
    var statusType = { '草稿': 'gray', '待审核': 'warn', '已发布': 'ok' };
    var all = App.data.videoQueue;
    var projects = App.data.videoProjects || [];

    // 当前筛选下的视频（保留原数组索引，操作按 id 定位）
    var q = state.projFilter === 'all' ? all
      : all.filter(function (v) { return v.project === state.projFilter; });

    var chips =
      '<div class="row mb12" style="flex-wrap:wrap">' +
      '<button class="btn btn-sm' + (state.projFilter === 'all' ? ' btn-primary' : '') + '" data-proj="all">全部（' + all.length + '）</button>' +
      projects.map(function (pj) {
        var n = all.filter(function (v) { return v.project === pj.id; }).length;
        return '<button class="btn btn-sm' + (state.projFilter === pj.id ? ' btn-primary' : '') + '" data-proj="' + App.esc(pj.id) + '">' +
          App.esc(pj.name) + '（' + n + '）</button>';
      }).join('') +
      '<button class="btn btn-sm btn-ghost" id="vf-proj-manage">管理项目</button>' +
      '</div>';

    body.innerHTML =
      '<div class="card mb0">' +
      '<div class="card-title"><span>视频仓库 <span class="sub">生成的视频按项目管理 · 审核通过后自动发布到视频号</span></span>' +
      '<button class="btn btn-sm" id="vf-api-cfg">⚙ 生成 API：' + (apiConfigured() ? '<span class="text-ok">已配置</span>' : '<span class="text-warn">演示模式</span>') + '</button>' +
      '</div>' +
      chips +
      '<div style="overflow-x:auto">' +
      App.ui.table([
        {
          key: 'title', label: '视频', render: function (r) {
            var cover = r.cover
              ? '<img src="' + r.cover + '" alt="" style="width:64px;height:44px;object-fit:cover;border-radius:6px;flex-shrink:0">'
              : '<div style="width:64px;height:44px;border-radius:6px;background:#f1f3f7;display:flex;align-items:center;justify-content:center;flex-shrink:0">🎬</div>';
            return '<div class="row" style="align-items:center;min-width:240px">' + cover +
              '<div><b>' + App.esc(r.title) + '</b>' +
              '<div class="small muted">' + App.esc(r.template) + (r.product ? ' · ' + App.esc(r.product) : '') + '</div></div></div>';
          }
        },
        {
          key: 'project', label: '项目', render: function (r) {
            var pj = findProject(r.project);
            return pj ? App.ui.badge(pj.name, 'info') : '<span class="muted small">未分组</span>';
          }
        },
        { key: 'status', label: '状态', render: function (r) { return App.ui.badge(r.status, statusType[r.status] || 'gray'); } },
        { key: 'date', label: '日期' },
        {
          key: 'stats', label: '数据', render: function (r) {
            return '<span class="small">播放 ' + App.fmt.num(r.views) + ' · 赞 ' + App.fmt.num(r.likes) +
              ' · 线索 ' + (r.leads > 0 ? '<b class="text-ok">' + r.leads + '</b>' : '0') + '</span>';
          }
        },
        {
          key: 'op', label: '操作', render: function (r) {
            var h = '';
            if (r.status === '待审核') h += '<button class="btn btn-sm btn-primary" data-act="approve" data-vid="' + App.esc(r.id) + '">审核发布</button> ';
            if (r.status === '草稿') h += '<button class="btn btn-sm" data-act="edit" data-vid="' + App.esc(r.id) + '">继续编辑</button> ';
            if (r.rows && r.rows.length) h += '<button class="btn btn-sm" data-act="script" data-vid="' + App.esc(r.id) + '">脚本</button> ';
            h += '<button class="btn btn-sm btn-danger" data-act="delvid" data-vid="' + App.esc(r.id) + '">删除</button>';
            return h;
          }
        }
      ], q, { emptyMsg: state.projFilter === 'all' ? '仓库为空，去「AI 生成向导」产出第一条视频吧' : '该项目下暂无视频' }) +
      '</div></div>';

    body.querySelectorAll('button[data-proj]').forEach(function (b) {
      b.onclick = function () { state.projFilter = b.getAttribute('data-proj'); drawBody(); };
    });
    var manageBtn = body.querySelector('#vf-proj-manage');
    if (manageBtn) manageBtn.onclick = manageProjectsModal;
    var apiBtn = body.querySelector('#vf-api-cfg');
    if (apiBtn) apiBtn.onclick = apiConfigModal;

    body.querySelectorAll('button[data-act]').forEach(function (b) {
      b.onclick = function () {
        var vid = b.getAttribute('data-vid');
        var item = null;
        for (var i = 0; i < all.length; i++) if (all[i].id === vid) item = all[i];
        if (!item) return;
        var act = b.getAttribute('data-act');
        if (act === 'approve') {
          item.status = '已发布';
          App.persist();
          draw(); // 刷新 KPI 与列表
          App.ui.toast('已发布（演示环境：正式版对接视频号发布接口）', 'ok');
        } else if (act === 'script') {
          showVideoScriptModal(item);
        } else if (act === 'delvid') {
          deleteVideo(item);
        } else {
          App.ui.toast('演示环境：正式版将打开脚本编辑器继续编辑该草稿');
        }
      };
    });
  }

  /* ---- 查看已生成视频的分镜脚本 ---- */
  function showVideoScriptModal(item) {
    var tableHtml = '<div style="overflow-x:auto">' + App.ui.table([
      { key: 'shot', label: '镜头', width: '80px', render: function (r) { return '<b>' + App.esc(r.shot) + '</b>'; } },
      { key: 'visual', label: '画面', render: function (r) { return App.esc(r.visual); } },
      { key: 'zh', label: '中文字幕', render: function (r) { return App.esc(r.zh) || '-'; } },
      { key: 'en', label: '英文字幕', render: function (r) { return '<span class="small">' + App.esc(r.en) + '</span>'; } },
      { key: 'vo', label: '配音', render: function (r) { return r.vo ? App.esc(r.vo) : '<span class="muted">-</span>'; } }
    ], item.rows) + '</div>';
    App.ui.modal(
      item.title + ' · 分镜脚本',
      '<div class="small muted mb8">' + App.esc(item.template) + (item.lang ? ' · 字幕语言：' + App.esc(item.lang) : '') + ' · ' + item.rows.length + ' 组分镜</div>' + tableHtml,
      '<button class="btn" id="vf-script-close">关闭</button>',
      { large: true }
    );
    document.getElementById('vf-script-close').onclick = App.ui.closeModal;
  }

  /* ---- 删除视频 ---- */
  function deleteVideo(item) {
    App.ui.modal('删除视频',
      '<div class="notice">确定从仓库删除「' + App.esc(item.title) + '」吗？删除后无法找回。</div>',
      '<button class="btn" id="vf-vd-cancel">取消</button>' +
      '<button class="btn btn-danger" id="vf-vd-ok">删除</button>');
    document.getElementById('vf-vd-cancel').onclick = App.ui.closeModal;
    document.getElementById('vf-vd-ok').onclick = function () {
      var i = App.data.videoQueue.indexOf(item);
      if (i >= 0) App.data.videoQueue.splice(i, 1);
      App.persist();
      App.ui.closeModal();
      draw();
      App.ui.toast('已删除「' + item.title + '」');
    };
  }

  /* ---- 项目管理弹窗：新建 / 重命名 / 删除 ---- */
  function manageProjectsModal() {
    var projects = App.data.videoProjects;

    App.ui.modal('管理项目',
      '<div class="small muted mb8">项目用于给生成的视频归类（例如：按投放计划、按产品、按月份）。</div>' +
      '<div id="vf-pm-list"></div>' +
      '<div class="row mt12">' +
      '<input class="input" id="vf-pm-new" style="flex:1" placeholder="新项目名称，例如：8月 视频号日更">' +
      '<button class="btn btn-primary" id="vf-pm-add">新建项目</button>' +
      '</div>',
      '<button class="btn" id="vf-pm-close">完成</button>');

    function renderList() {
      var box = document.getElementById('vf-pm-list');
      box.innerHTML = projects.map(function (pj, i) {
        var n = App.data.videoQueue.filter(function (v) { return v.project === pj.id; }).length;
        return '<div class="row mb8" style="align-items:center">' +
          '<input class="input" style="flex:1" data-pm-name="' + i + '" value="' + App.esc(pj.name) + '">' +
          '<span class="small muted" style="width:64px;text-align:center">' + n + ' 条</span>' +
          '<button class="btn btn-sm btn-danger" data-pm-del="' + i + '">删除</button>' +
          '</div>';
      }).join('') || '<div class="small muted">暂无项目</div>';

      box.querySelectorAll('input[data-pm-name]').forEach(function (inp) {
        inp.onchange = function () {
          var pj = projects[parseInt(inp.getAttribute('data-pm-name'), 10)];
          var v = inp.value.trim();
          if (!v) { inp.value = pj.name; App.ui.toast('项目名称不能为空', 'bad'); return; }
          pj.name = v;
          App.persist();
          App.ui.toast('已重命名为「' + v + '」', 'ok');
        };
      });
      box.querySelectorAll('button[data-pm-del]').forEach(function (btn) {
        btn.onclick = function () {
          var pj = projects[parseInt(btn.getAttribute('data-pm-del'), 10)];
          var n = App.data.videoQueue.filter(function (v) { return v.project === pj.id; }).length;
          if (n > 0) { App.ui.toast('该项目下还有 ' + n + ' 条视频，请先删除或移走视频', 'bad'); return; }
          projects.splice(projects.indexOf(pj), 1);
          if (state.projFilter === pj.id) state.projFilter = 'all';
          App.persist();
          renderList();
          App.ui.toast('已删除项目「' + pj.name + '」');
        };
      });
    }
    renderList();

    document.getElementById('vf-pm-add').onclick = function () {
      var inp = document.getElementById('vf-pm-new');
      var v = inp.value.trim();
      if (!v) { App.ui.toast('请输入项目名称', 'bad'); return; }
      projects.push({ id: 'vp' + Date.now(), name: v });
      inp.value = '';
      App.persist();
      renderList();
      App.ui.toast('已新建项目「' + v + '」', 'ok');
    };
    document.getElementById('vf-pm-close').onclick = function () {
      App.ui.closeModal();
      drawBody(); // 项目名可能已变，刷新筛选行
    };
  }

  /* ---- 生成 API 配置弹窗（占位，部署服务器后接真实视频生成服务） ---- */
  function apiConfigModal() {
    var cfg = getApiConfig() || { provider: '', url: '', key: '' };
    App.ui.modal('视频生成 API 配置',
      '<div class="notice mb12">真实的视频合成需要接入视频生成服务（部署到服务器后由技术配置）。' +
      '未配置时系统以演示模式运行：提交合成只记录任务，不产生真实视频文件。</div>' +
      '<div class="field"><label class="field-label">服务商</label>' +
      '<select class="select" id="vf-api-provider">' +
      ['自建剪辑服务', '可灵 AI', '海螺 AI', '即梦 AI', '其他'].map(function (s) {
        return '<option value="' + s + '"' + (cfg.provider === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="field"><label class="field-label">API 地址</label>' +
      '<input class="input" id="vf-api-url" placeholder="https://…" value="' + App.esc(cfg.url) + '"></div>' +
      '<div class="field"><label class="field-label">API 密钥</label>' +
      '<input class="input" id="vf-api-key" type="password" placeholder="填入服务商提供的 Key" value="' + App.esc(cfg.key) + '"></div>' +
      '<div class="small muted">密钥仅保存在本浏览器（正式版保存在服务器端，不下发给前端）。</div>',
      '<button class="btn" id="vf-api-cancel">取消</button>' +
      (apiConfigured() ? '<button class="btn btn-danger" id="vf-api-clear">清除配置</button>' : '') +
      '<button class="btn btn-primary" id="vf-api-save">保存</button>');

    document.getElementById('vf-api-cancel').onclick = App.ui.closeModal;
    var clearBtn = document.getElementById('vf-api-clear');
    if (clearBtn) clearBtn.onclick = function () {
      try { localStorage.removeItem(API_STORE); } catch (e) {}
      App.ui.closeModal();
      drawBody();
      App.ui.toast('已清除 API 配置，回到演示模式');
    };
    document.getElementById('vf-api-save').onclick = function () {
      var url = document.getElementById('vf-api-url').value.trim();
      if (!url) { App.ui.toast('请填写 API 地址', 'bad'); return; }
      try {
        localStorage.setItem(API_STORE, JSON.stringify({
          provider: document.getElementById('vf-api-provider').value,
          url: url,
          key: document.getElementById('vf-api-key').value.trim()
        }));
      } catch (e) {}
      App.ui.closeModal();
      drawBody();
      App.ui.toast('API 配置已保存，提交合成时将调用该服务', 'ok');
    };
  }

  /* ---------- 注册模块 ---------- */
  App.registerModule({
    id: 'video-factory',
    nav: { section: '流量端', label: '视频号视频工厂', icon: '🎬' },
    render: render
  });
  // 启动即加载模板工作副本，保证其他模块（如广告投放的素材下拉）读到的是同一份数据
  App.onDataReady(initTemplates);
})();
