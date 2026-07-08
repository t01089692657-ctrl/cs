/* ============ 视频合成引擎（内置 ffmpeg，真出片） ============
 * 把「产品图片 + 分镜脚本(中英字幕)」渲染成真实 mp4：
 *   每组分镜 → 一段图片视频(按尺寸铺满/加暗底 + 烧录字幕) → 拼接成片。
 * ffmpeg 解析顺序：FFMPEG_PATH 环境变量 > 随包 deps/bin > 系统 PATH。
 * 缺 ffmpeg 时 available()=false，路由据此回退演示模式（前端仍用模拟预览）。
 * 参考并吸收自「AI 视频创作平台」的 media.js。
 */
'use strict';
var fs = require('fs');
var path = require('path');
var os = require('os');
var cp = require('child_process');

var IS_WIN = process.platform === 'win32';
var EXE = IS_WIN ? '.exe' : '';

/* ---------- ffmpeg / 字体 解析 ---------- */
function candidateFfmpeg() {
  var list = [];
  if (process.env.FFMPEG_PATH) list.push(process.env.FFMPEG_PATH);
  var platformDir = process.platform + '-' + process.arch;
  // 随包 ffmpeg（如从「AI 视频创作平台」带来的 deps/bin）
  list.push(path.join(__dirname, '..', '..', 'deps', 'bin', platformDir, 'ffmpeg' + EXE));
  list.push(path.join(__dirname, '..', '..', 'deps', 'bin', 'ffmpeg' + EXE));
  list.push('ffmpeg'); // 系统 PATH
  return list;
}

var _ffmpeg = null;
function resolveFfmpeg() {
  if (_ffmpeg !== null) return _ffmpeg;
  var cands = candidateFfmpeg();
  for (var i = 0; i < cands.length; i++) {
    var c = cands[i];
    var isPath = c === 'ffmpeg' + EXE || c === 'ffmpeg';
    if (!isPath && !fs.existsSync(c)) continue;
    if (!isPath && !IS_WIN) { try { fs.chmodSync(c, 0o755); } catch (e) {} }
    try {
      var r = cp.spawnSync(c, ['-version'], { timeout: 15000, encoding: 'utf8' });
      if (r.status === 0 && /ffmpeg version/i.test((r.stdout || '') + (r.stderr || ''))) { _ffmpeg = c; return c; }
    } catch (e) {}
  }
  _ffmpeg = '';
  return '';
}

function resolveFont() {
  var cands = [
    process.env.SUBTITLE_FONT,
    '/System/Library/Fonts/PingFang.ttc',              // macOS
    '/System/Library/Fonts/STHeiti Medium.ttc',
    '/System/Library/Fonts/Hiragino Sans GB.ttc',
    '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',    // Linux 文泉驿
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    'C:\\Windows\\Fonts\\msyh.ttc'                       // Windows 微软雅黑
  ].filter(Boolean);
  for (var i = 0; i < cands.length; i++) if (fs.existsSync(cands[i])) return cands[i];
  return '';
}

function available() { return !!resolveFfmpeg(); }

/* ---------- 尺寸 ---------- */
var RATIO_SIZE = {
  '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080], '4:5': [1080, 1350]
};
function sizeOf(ratio) { return RATIO_SIZE[ratio] || RATIO_SIZE['9:16']; }

/* ---------- 工具 ---------- */
function run(bin, args, timeoutMs) {
  return new Promise(function (resolve) {
    var p = cp.spawn(bin, args, { windowsHide: true });
    var err = '';
    p.stderr.on('data', function (d) { err += d.toString(); });
    var timer = setTimeout(function () { try { p.kill('SIGKILL'); } catch (e) {} }, timeoutMs || 600000);
    p.on('close', function (code) { clearTimeout(timer); resolve({ ok: code === 0, code: code, stderr: err }); });
    p.on('error', function (e) { clearTimeout(timer); resolve({ ok: false, code: -1, stderr: e.message }); });
  });
}
function ffescapePath(p) { return p.replace(/\\/g, '/').replace(/:/g, '\\:'); }
function dataUrlToFile(dataUrl, file) {
  var m = String(dataUrl).match(/^data:(image\/\w+);base64,(.+)$/s);
  if (!m) return false;
  fs.writeFileSync(file, Buffer.from(m[2], 'base64'));
  return true;
}

/* ---------- 单段：图片(或纯色) + 字幕 → 视频片段 ---------- */
async function makeClip(opts) {
  var ff = resolveFfmpeg();
  var size = sizeOf(opts.ratio), W = size[0], H = size[1];
  var dur = Math.max(1.5, Math.min(8, opts.dur || 3));
  var font = resolveFont();

  var vf = [];
  if (opts.image) {
    // 铺满并居中，两侧/上下补暗底，避免裁掉产品
    vf.push('scale=' + W + ':' + H + ':force_original_aspect_ratio=decrease');
    vf.push('pad=' + W + ':' + H + ':(ow-iw)/2:(oh-ih)/2:color=0x0f172a');
  }
  vf.push('format=yuv420p');

  // 烧字幕（用 textfile 规避转义）：中文在下、英文更下
  var zhFile = opts.zhFile, enFile = opts.enFile;
  if (font && zhFile) {
    vf.push("drawtext=fontfile='" + ffescapePath(font) + "':textfile='" + ffescapePath(zhFile) +
      "':fontcolor=white:fontsize=" + Math.round(W / 20) + ":box=1:boxcolor=black@0.45:boxborderw=16:x=(w-text_w)/2:y=h-text_h-" + Math.round(H / 9));
  }
  if (font && enFile) {
    vf.push("drawtext=fontfile='" + ffescapePath(font) + "':textfile='" + ffescapePath(enFile) +
      "':fontcolor=white@0.92:fontsize=" + Math.round(W / 28) + ":box=1:boxcolor=black@0.4:boxborderw=10:x=(w-text_w)/2:y=h-text_h-" + Math.round(H / 14));
  }
  // 镜头标签（左上角）
  if (font && opts.shot) {
    vf.push("drawtext=fontfile='" + ffescapePath(font) + "':text='" + String(opts.shot).replace(/['\\:]/g, '') +
      "':fontcolor=white:fontsize=" + Math.round(W / 32) + ":box=1:boxcolor=0x2563eb@0.85:boxborderw=8:x=" + Math.round(W / 36) + ":y=" + Math.round(H / 36));
  }

  var args = ['-y'];
  if (opts.image) args.push('-loop', '1', '-t', String(dur), '-i', opts.image);
  else args.push('-f', 'lavfi', '-t', String(dur), '-i', 'color=c=0x0f172a:s=' + W + 'x' + H + ':r=30');
  args.push('-f', 'lavfi', '-t', String(dur), '-i', 'anullsrc=r=44100:cl=stereo');
  args.push('-vf', vf.join(','), '-r', '30',
    '-c:v', 'libx264', '-crf', '23', '-preset', 'veryfast',
    '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-shortest', opts.out);
  var r = await run(ff, args, 300000);
  if (!r.ok || !fs.existsSync(opts.out)) throw new Error('片段渲染失败: ' + (r.stderr || '').slice(-300));
  return opts.out;
}

/* ---------- 拼接（重编码 concat，稳定） ---------- */
async function concat(files, out) {
  var ff = resolveFfmpeg();
  if (files.length === 1) { fs.copyFileSync(files[0], out); return out; }
  var inputs = [];
  files.forEach(function (f) { inputs.push('-i', f); });
  var streams = files.map(function (_, i) { return '[' + i + ':v:0][' + i + ':a:0]'; }).join('');
  var filter = streams + 'concat=n=' + files.length + ':v=1:a=1[v][a]';
  var args = ['-y'].concat(inputs, [
    '-filter_complex', filter, '-map', '[v]', '-map', '[a]',
    '-r', '30', '-c:v', 'libx264', '-crf', '23', '-preset', 'veryfast',
    '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out
  ]);
  var r = await run(ff, args, 900000);
  if (!r.ok || !fs.existsSync(out)) throw new Error('拼接失败: ' + (r.stderr || '').slice(-300));
  return out;
}

/* ---------- 主入口：分镜 + 产品图 → mp4 ---------- */
// opts: { rows:[{shot,zh,en}], images:[dataURL], ratio, durationSec, lang, outPath }
async function compose(opts) {
  if (!available()) throw new Error('服务器未安装 ffmpeg，无法真实合成');
  var rows = (opts.rows && opts.rows.length) ? opts.rows : [{ shot: '镜头1', zh: '', en: '' }];
  var images = opts.images || [];
  var ratio = opts.ratio || '9:16';
  var total = Math.max(6, Math.min(90, opts.durationSec || 30));
  var per = Math.max(1.5, Math.min(8, total / rows.length));
  var lang = opts.lang || '双语';

  var work = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-'));
  var clips = [];
  try {
    // 落地产品图
    var imgFiles = [];
    images.forEach(function (d, i) {
      var f = path.join(work, 'img' + i + '.jpg');
      if (dataUrlToFile(d, f)) imgFiles.push(f);
    });

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      var zhFile = '', enFile = '';
      if (lang !== '英文' && r.zh) { zhFile = path.join(work, 'zh' + i + '.txt'); fs.writeFileSync(zhFile, String(r.zh), 'utf8'); }
      if (lang !== '中文' && r.en) { enFile = path.join(work, 'en' + i + '.txt'); fs.writeFileSync(enFile, String(r.en), 'utf8'); }
      var out = path.join(work, 'clip' + String(i).padStart(2, '0') + '.mp4');
      await makeClip({
        image: imgFiles.length ? imgFiles[i % imgFiles.length] : '',
        zhFile: zhFile, enFile: enFile, shot: r.shot,
        ratio: ratio, dur: per, out: out
      });
      clips.push(out);
    }

    fs.mkdirSync(path.dirname(opts.outPath), { recursive: true });
    await concat(clips, opts.outPath);
    return { output: opts.outPath, clips: clips.length, ratio: ratio, durationApprox: Math.round(per * rows.length) };
  } finally {
    try { clips.forEach(function (c) { fs.existsSync(c) && fs.unlinkSync(c); }); } catch (e) {}
    try { fs.rmSync(work, { recursive: true, force: true }); } catch (e) {}
  }
}

module.exports = { available: available, compose: compose, sizeOf: sizeOf, resolveFfmpeg: resolveFfmpeg, resolveFont: resolveFont };
