/* ============ 大模型服务（provider 无关） ============
 * live：按 LLM_PROVIDER 调对应 API（OpenAI 兼容：openai/deepseek/qwen；或 claude）。
 * demo：无 key 时返回规则式内容，保证流程能跑通。
 */
'use strict';
var cfg = require('../config');
var fetchT = require('./httpx').fetchT;

var OPENAI_COMPATIBLE = {
  openai: { base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  deepseek: { base: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  qwen: { base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' }
};

async function chat(messages, opts) {
  opts = opts || {};
  if (!cfg.llm.live) return demoChat(messages);

  var provider = cfg.llm.provider;
  try {
    if (provider === 'claude') return await callClaude(messages, opts);
    return await callOpenAICompatible(provider, messages, opts);
  } catch (e) {
    console.warn('[llm] 调用失败，回退演示内容:', e.message);
    return demoChat(messages);
  }
}

async function callOpenAICompatible(provider, messages, opts) {
  var preset = OPENAI_COMPATIBLE[provider] || OPENAI_COMPATIBLE.openai;
  var base = cfg.llm.baseUrl || preset.base;
  var model = cfg.llm.model || preset.model;
  var res = await fetchT(base + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.llm.key },
    body: JSON.stringify({ model: model, messages: messages, temperature: opts.temperature != null ? opts.temperature : 0.4 })
  }, 30000);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var data = await res.json();
  return data.choices[0].message.content;
}

async function callClaude(messages, opts) {
  var base = cfg.llm.baseUrl || 'https://api.anthropic.com/v1';
  var model = cfg.llm.model || 'claude-3-5-sonnet-latest';
  // 拆出 system
  var sys = messages.filter(function (m) { return m.role === 'system'; }).map(function (m) { return m.content; }).join('\n');
  var msgs = messages.filter(function (m) { return m.role !== 'system'; })
    .map(function (m) { return { role: m.role, content: m.content }; });
  var res = await fetchT(base + '/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.llm.key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({ model: model, system: sys, messages: msgs, max_tokens: opts.maxTokens || 1024 })
  }, 30000);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var data = await res.json();
  return data.content[0].text;
}

/* ---- 演示回退：规则式，尽量返回结构化可用内容 ---- */
function demoChat(messages) {
  var last = messages[messages.length - 1] || {};
  var text = String(last.content || '');
  // 若要求打分，返回一个 JSON 分数
  if (/score|打分|评分/.test(text)) {
    return JSON.stringify({ score: 60 + Math.floor(Math.random() * 30), reason: '演示评分：与目标画像基本匹配（未接大模型 API）。' });
  }
  return '（演示模式回复，未接入大模型 API。部署后填入 LLM_API_KEY 即为真实生成。）';
}

module.exports = { chat: chat };
