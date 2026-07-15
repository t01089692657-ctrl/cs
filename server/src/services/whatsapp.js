/* ============ WhatsApp 通道B：协议/网页版（扫码挂现有号） ============
 * channel=off     关闭
 * channel=demo    桩演示（假二维码/假会话，用于联调前端，不真连）
 * channel=baileys 真实协议直连（需 npm i @whiskeysockets/baileys qrcode）
 *
 * 设计要点：
 * - 单号 MVP：一个 WhatsApp 号，扫码登录，1:1 收发（老客户维护场景）。
 * - 会话存内存 + 快照到 sessionDir/store.json（重启不丢近期会话）。
 * - 发送限速（防封）：两条消息最小间隔 minSendGapMs。
 * - 出海代理：境内 Mac mini 经 OUTBOUND_PROXY 连 WhatsApp（best-effort）。
 * 真实扫码/收发需在能访问 WhatsApp 的机器上验证，本沙箱无法联网到 WhatsApp。
 */
'use strict';
var fs = require('fs');
var path = require('path');
var cfg = require('../config');

var MAX_MSGS_PER_CHAT = 500;

// 连接与会话状态（进程内单例）
var conn = { channel: cfg.whatsapp.channel, status: 'disconnected', qr: null, me: null, error: null };
var chats = {};          // jid -> { jid, name, messages:[{id,from,text,ts}], lastTs }
var sock = null;         // baileys socket
var lastSendAt = 0;
var stubTimers = [];

/* ---------- 持久化（会话快照） ---------- */
function storeFile() { return path.join(cfg.whatsapp.sessionDir, 'store.json'); }
function ensureDir() { try { fs.mkdirSync(cfg.whatsapp.sessionDir, { recursive: true }); } catch (e) {} }
function saveStore() {
  try { ensureDir(); fs.writeFileSync(storeFile(), JSON.stringify({ chats: chats, me: conn.me })); } catch (e) {}
}
function loadStore() {
  try {
    var d = JSON.parse(fs.readFileSync(storeFile(), 'utf8'));
    if (d && d.chats) chats = d.chats;
    if (d && d.me) conn.me = d.me;
  } catch (e) {}
}
loadStore();

/* ---------- 会话读写 ---------- */
function upsertChat(jid, name) {
  if (!chats[jid]) chats[jid] = { jid: jid, name: name || jid, messages: [], lastTs: 0 };
  if (name) chats[jid].name = name;
  return chats[jid];
}
function addMsg(jid, from, text, name, ts) {
  var c = upsertChat(jid, name);
  ts = ts || Date.now();
  c.messages.push({ id: 'm' + ts + Math.floor(Math.random() * 1000), from: from, text: text, ts: ts });
  if (c.messages.length > MAX_MSGS_PER_CHAT) c.messages = c.messages.slice(-MAX_MSGS_PER_CHAT);
  c.lastTs = ts;
  saveStore();
}

/* ---------- 对外接口 ---------- */
var S = {};

S.status = function () {
  return {
    channel: conn.channel,
    status: conn.status,           // disconnected | qr | connecting | connected
    qr: conn.qr,                   // dataURL 或原始串（扫码用）
    me: conn.me,
    error: conn.error,
    chatCount: Object.keys(chats).length,
    live: cfg.whatsapp.channel === 'baileys'
  };
};

S.listChats = function () {
  return Object.keys(chats).map(function (jid) {
    var c = chats[jid];
    var last = c.messages[c.messages.length - 1];
    return { jid: jid, name: c.name, lastText: last ? last.text : '', lastTs: c.lastTs, count: c.messages.length };
  }).sort(function (a, b) { return b.lastTs - a.lastTs; });
};

S.listMessages = function (jid) {
  return (chats[jid] && chats[jid].messages) || [];
};

S.connect = function () {
  if (conn.status === 'connected') return Promise.resolve(S.status());
  conn.error = null;
  if (cfg.whatsapp.channel === 'baileys') return connectBaileys();
  return connectStub();
};

S.logout = function () {
  clearStubTimers();
  if (sock) { try { sock.logout && sock.logout(); } catch (e) {} try { sock.end && sock.end(); } catch (e) {} sock = null; }
  conn.status = 'disconnected'; conn.qr = null; conn.me = null;
  try { fs.rmSync(cfg.whatsapp.sessionDir, { recursive: true, force: true }); } catch (e) {}
  chats = {};
  return Promise.resolve(S.status());
};

// 发送：限速防封；返回 { ok } 或抛错
S.send = function (jid, text) {
  if (conn.status !== 'connected') return Promise.reject(new Error('WhatsApp 未连接'));
  if (!jid || !text) return Promise.reject(new Error('缺少收件人或内容'));
  var now = Date.now();
  var wait = cfg.whatsapp.minSendGapMs - (now - lastSendAt);
  if (wait > 0) return Promise.reject(new Error('发送过快，请 ' + Math.ceil(wait / 1000) + ' 秒后再发（防封限速）'));
  lastSendAt = now;

  if (cfg.whatsapp.channel === 'baileys') {
    return sock.sendMessage(jid, { text: text }).then(function () {
      addMsg(jid, 'me', text);
      return { ok: true };
    });
  }
  // 桩：本地回显 + 模拟对方几秒后回复
  addMsg(jid, 'me', text);
  var t = setTimeout(function () {
    addMsg(jid, 'them', '（演示回复）收到：' + text.slice(0, 20));
  }, 2500);
  stubTimers.push(t);
  return Promise.resolve({ ok: true });
};

/* ---------- 桩通道（可在无网络环境联调） ---------- */
function clearStubTimers() { stubTimers.forEach(function (t) { clearTimeout(t); }); stubTimers = []; }
function connectStub() {
  conn.status = 'qr';
  conn.qr = 'DEMO-QR-' + Date.now();   // 前端展示占位二维码
  // 4 秒后模拟扫码成功
  var t1 = setTimeout(function () {
    conn.status = 'connected'; conn.qr = null; conn.me = { id: 'demo@s.whatsapp.net', name: '演示号' };
    if (!Object.keys(chats).length) {
      addMsg('8613800000001@s.whatsapp.net', 'them', 'Hi, still available for the 8 units?', 'Mike (德州营地)');
      addMsg('8613800000002@s.whatsapp.net', 'them', 'Please send the PI', 'Emma (澳洲经销)');
    }
    saveStore();
  }, 4000);
  stubTimers.push(t1);
  return Promise.resolve(S.status());
}

/* ---------- 真实通道（Baileys，需依赖 + 能访问 WhatsApp） ---------- */
function proxyAgent() {
  if (!cfg.outboundProxy) return undefined;
  try {
    var url = cfg.outboundProxy;
    if (/^socks/i.test(url)) return new (require('socks-proxy-agent').SocksProxyAgent)(url);
    return new (require('https-proxy-agent').HttpsProxyAgent)(url);
  } catch (e) {
    console.warn('[whatsapp] 代理 agent 不可用（可 npm i https-proxy-agent socks-proxy-agent）:', e.message);
    return undefined;
  }
}

async function connectBaileys() {
  var baileys;
  try { baileys = require('@whiskeysockets/baileys'); }
  catch (e) {
    conn.status = 'disconnected';
    conn.error = '未安装 @whiskeysockets/baileys，请在 server 目录执行：npm i @whiskeysockets/baileys qrcode';
    return S.status();
  }
  var makeWASocket = baileys.default || baileys.makeWASocket;
  var useMultiFileAuthState = baileys.useMultiFileAuthState;
  var DisconnectReason = baileys.DisconnectReason;

  ensureDir();
  var authState = await useMultiFileAuthState(path.join(cfg.whatsapp.sessionDir, 'auth'));
  conn.status = 'connecting'; conn.error = null;

  var agent = proxyAgent();
  sock = makeWASocket({
    auth: authState.state,
    printQRInTerminal: false,
    agent: agent,
    fetchAgent: agent,
    browser: ['外贸全链路CRM', 'Chrome', '1.0']
  });

  sock.ev.on('creds.update', authState.saveCreds);

  sock.ev.on('connection.update', function (u) {
    if (u.qr) {
      // 渲染为可扫描二维码图片（有 qrcode 依赖时转 dataURL，否则给原始串）
      try {
        require('qrcode').toDataURL(u.qr).then(function (dataUrl) { conn.qr = dataUrl; conn.status = 'qr'; })
          .catch(function () { conn.qr = u.qr; conn.status = 'qr'; });
      } catch (e) { conn.qr = u.qr; conn.status = 'qr'; }
    }
    if (u.connection === 'open') {
      conn.status = 'connected'; conn.qr = null;
      var meId = (sock.user && sock.user.id) || null;
      conn.me = { id: meId, name: (sock.user && sock.user.name) || meId };
      saveStore();
    }
    if (u.connection === 'close') {
      var code = u.lastDisconnect && u.lastDisconnect.error && u.lastDisconnect.error.output &&
        u.lastDisconnect.error.output.statusCode;
      var loggedOut = DisconnectReason && code === DisconnectReason.loggedOut;
      conn.status = 'disconnected';
      if (!loggedOut) { setTimeout(function () { connectBaileys().catch(function () {}); }, 3000); } // 断线自动重连
    }
  });

  sock.ev.on('messages.upsert', function (m) {
    try {
      (m.messages || []).forEach(function (msg) {
        if (!msg.message) return;
        if (msg.key && msg.key.fromMe) return;   // 自己发的已在 send() 里记
        var jid = msg.key.remoteJid;
        if (!jid || /@g\.us$/.test(jid) || jid === 'status@broadcast') return; // 跳过群/状态
        var text = msg.message.conversation ||
          (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) || '[非文本消息]';
        var name = (msg.pushName) || jid;
        addMsg(jid, 'them', text, name);
      });
    } catch (e) { console.warn('[whatsapp] 处理来消息出错:', e.message); }
  });

  return S.status();
}

module.exports = S;
