#!/usr/bin/env bash
# ============ 一键部署脚本 ============
# 在服务器上（已装 docker + docker compose）执行：bash deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="server/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "首次部署：正在从模板创建 $ENV_FILE"
  cp server/.env.example "$ENV_FILE"
  echo "⚠️  请先编辑 $ENV_FILE 填入：JWT_SECRET、ADMIN_EMAIL/ADMIN_PASSWORD、LLM_API_KEY、SMTP_* 等，再重新运行本脚本。"
  exit 1
fi

echo "==> 拉取/构建镜像并启动"
docker compose pull || true
docker compose up -d --build

echo "==> 等待应用就绪"
sleep 5
if curl -fsS http://localhost:8080/api/health >/dev/null; then
  echo "✅ 部署成功。访问 http://<服务器IP>:8080 （建议配 nginx + 域名 + HTTPS，见 deploy/nginx.conf）"
  echo "   用 .env 里的 ADMIN_EMAIL / ADMIN_PASSWORD 登录，进「管理后台」创建其他 9 个员工账号。"
else
  echo "❌ 健康检查失败，请查看日志：docker compose logs app"
  exit 1
fi
