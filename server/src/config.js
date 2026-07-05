/* ============ 配置中心 ============
 * 从环境变量读取配置，并按“某能力的 key 是否填了”决定它是 live 还是 demo。
 * 这样部署方只要往 .env 填 key，对应能力就自动从演示切到真实，无需改代码。
 */
'use strict';
require('dotenv').config();

function bool(v) { return !!(v && String(v).trim()); }

var cfg = {
  port: parseInt(process.env.PORT, 10) || 8080,
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  // 出海代理：Mac mini/服务器在境内时，通过它访问 Google/Firecrawl/Hunter 等海外 API
  outboundProxy: (process.env.OUTBOUND_PROXY || '').trim(),
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@demo.local',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  },

  db: {
    url: (process.env.DATABASE_URL || '').trim(),
    get live() { return bool(process.env.DATABASE_URL); }
  },

  llm: {
    provider: (process.env.LLM_PROVIDER || 'deepseek').trim(),
    key: (process.env.LLM_API_KEY || '').trim(),
    baseUrl: (process.env.LLM_BASE_URL || '').trim(),
    model: (process.env.LLM_MODEL || '').trim(),
    get live() { return bool(process.env.LLM_API_KEY); }
  },

  smtp: {
    host: (process.env.SMTP_HOST || '').trim(),
    port: parseInt(process.env.SMTP_PORT, 10) || 465,
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').trim(),
    fromName: (process.env.SMTP_FROM_NAME || '').trim(),
    get live() { return bool(process.env.SMTP_HOST) && bool(process.env.SMTP_USER); }
  },

  crawl: {
    crawl4aiUrl: (process.env.CRAWL4AI_URL || '').trim(),
    firecrawlKey: (process.env.FIRECRAWL_API_KEY || '').trim(),
    get live() { return bool(process.env.CRAWL4AI_URL) || bool(process.env.FIRECRAWL_API_KEY); }
  },

  search: {
    serpApiKey: (process.env.SERPAPI_KEY || '').trim(),
    customsKey: (process.env.CUSTOMS_API_KEY || '').trim(),
    get live() { return bool(process.env.SERPAPI_KEY); }
  },

  emailFinder: {
    provider: (process.env.EMAIL_FINDER_PROVIDER || 'hunter').trim(),
    key: (process.env.EMAIL_FINDER_KEY || '').trim(),
    get live() { return bool(process.env.EMAIL_FINDER_KEY); }
  },

  video: {
    provider: (process.env.VIDEO_API_PROVIDER || '').trim(),
    url: (process.env.VIDEO_API_URL || '').trim(),
    key: (process.env.VIDEO_API_KEY || '').trim(),
    get live() { return bool(process.env.VIDEO_API_KEY); }
  },

  storage: {
    ossEndpoint: (process.env.OSS_ENDPOINT || '').trim(),
    ossBucket: (process.env.OSS_BUCKET || '').trim(),
    ossKey: (process.env.OSS_KEY || '').trim(),
    ossSecret: (process.env.OSS_SECRET || '').trim(),
    get live() { return bool(process.env.OSS_ENDPOINT) && bool(process.env.OSS_BUCKET); }
  }
};

// 生产环境（配置了数据库=真实部署）启动前的安全校验：
// 拒绝使用源码/模板里公开的默认签名密钥和默认管理员密码，避免被伪造令牌接管。
var INSECURE_SECRETS = ['', 'dev-insecure-secret-change-me', 'change-me-to-a-long-random-string'];
var INSECURE_PASSWORDS = ['', 'admin123', 'change-this-password'];
cfg.securityProblems = function () {
  var problems = [];
  if (INSECURE_SECRETS.indexOf(process.env.JWT_SECRET || '') >= 0 || cfg.jwtSecret.length < 16) {
    problems.push('JWT_SECRET 未设置或仍是默认/占位值，请改成一串足够长的随机字符串');
  }
  if (INSECURE_PASSWORDS.indexOf(process.env.ADMIN_PASSWORD || '') >= 0) {
    problems.push('ADMIN_PASSWORD 未设置或仍是默认值，请设置一个强密码');
  }
  return problems;
};

// 汇总各能力的运行模式，供 /api/health 展示
cfg.modes = function () {
  return {
    database: cfg.db.live ? 'live' : 'demo(memory)',
    llm: cfg.llm.live ? 'live(' + cfg.llm.provider + ')' : 'demo',
    email: cfg.smtp.live ? 'live' : 'demo',
    crawl: cfg.crawl.live ? 'live' : 'demo',
    search: cfg.search.live ? 'live' : 'demo',
    emailFinder: cfg.emailFinder.live ? 'live' : 'demo',
    video: cfg.video.live ? 'live' : 'demo',
    storage: cfg.storage.live ? 'live(oss)' : 'demo(local)'
  };
};

module.exports = cfg;
