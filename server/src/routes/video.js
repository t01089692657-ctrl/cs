/* ============ 路由：视频真实合成（内置 ffmpeg 引擎） ============
 * GET  /api/video/capabilities   → { ffmpeg: bool }  前端据此显示「生成成片」
 * POST /api/video/compose {videoId} → 用产品图 + 分镜脚本渲染真实 mp4，返回 { videoUrl }
 * 合成产物存 server/storage/videos，经 /generated/videos/*.mp4 播放。
 */
'use strict';
var express = require('express');
var path = require('path');
var fs = require('fs');
var router = express.Router();
var auth = require('../auth');
var store = require('../db/store');
var ah = require('../asyncHandler');
var video = require('../services/video');

var STORAGE = path.join(__dirname, '..', '..', 'storage', 'videos');

router.use(auth.requireAuth);

router.get('/capabilities', function (req, res) {
  res.json({ ffmpeg: video.available() });
});

router.post('/compose', ah(async function (req, res) {
  if (!video.available()) return res.status(400).json({ error: '服务器未安装 ffmpeg，无法真实合成' });
  var videoId = req.body && req.body.videoId;
  if (!videoId) return res.status(400).json({ error: '缺少 videoId' });

  var queue = (await store.collections.get('videoQueue'));
  queue = (queue && queue.data) || [];
  var item = null;
  for (var i = 0; i < queue.length; i++) if (queue[i].id === videoId) item = queue[i];
  if (!item) return res.status(404).json({ error: '视频不存在' });

  // 分镜：优先用条目自带脚本，否则回退同名模板的示例分镜
  var rows = item.rows;
  if (!rows || !rows.length) {
    var tpls = (await store.collections.get('videoTemplates'));
    tpls = (tpls && tpls.data) || [];
    var tpl = tpls.filter(function (t) { return t.name === item.template; })[0];
    rows = (tpl && tpl.sample) || [];
  }

  // 产品图
  var images = [];
  if (item.product) {
    var products = (await store.collections.get('products'));
    products = (products && products.data) || [];
    var p = products.filter(function (x) { return x.id === item.product; })[0];
    if (p && p.images) images = p.images;
  }
  if (item.cover && images.indexOf(item.cover) < 0) images.unshift(item.cover);

  fs.mkdirSync(STORAGE, { recursive: true });
  var fname = String(videoId).replace(/[^a-zA-Z0-9_-]/g, '_') + '.mp4';
  var outPath = path.join(STORAGE, fname);

  try {
    var result = await video.compose({
      rows: rows, images: images,
      ratio: item.ratio || '9:16', durationSec: item.durationSec || 30, lang: item.lang || '双语',
      outPath: outPath
    });
    var url = '/generated/videos/' + fname;
    await store.audit.log({
      user_id: req.user.sub, user_email: req.user.email,
      action: 'video:compose', detail: { videoId: videoId, clips: result.clips }
    });
    res.json({ ok: true, videoUrl: url, clips: result.clips, ratio: result.ratio });
  } catch (e) {
    console.error('[video] 合成失败:', e);
    res.status(500).json({ error: '合成失败: ' + e.message });
  }
}));

module.exports = router;
