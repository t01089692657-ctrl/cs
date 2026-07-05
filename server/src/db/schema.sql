-- ============ 外贸全链路 AI 系统 · 数据库结构（PostgreSQL） ============
-- 说明：共享业务数据以 JSONB 文档存于 collections（与前端“整表保存”模型一致，
--       10 人共享同一份）；users / audit_log / settings 用规范表以便查询与审计。

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'sales',   -- admin | sales | ops
  pass_hash   TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 共享业务数据：products / videoTemplates / videoQueue / videoProjects / icp / prospects …
CREATE TABLE IF NOT EXISTS collections (
  name        TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);

-- 服务器端配置（发信邮箱账号、获客引擎 key 等；密钥不下发前端）
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 操作审计（谁在何时做了什么）
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id     TEXT,
  user_email  TEXT,
  action      TEXT NOT NULL,
  detail      JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log (ts DESC);
