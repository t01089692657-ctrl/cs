#!/usr/bin/env bash
# ============ Mac mini 一键部署（原生，无需 Docker） ============
# 在 Mac mini 上打开「终端」，cd 到本项目目录，执行：
#   bash deploy/mac-setup.sh
# 脚本会：装 Node + PostgreSQL、建库、生成配置、安装依赖、设为开机自启并常驻。
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="$(pwd)"
SERVER_DIR="$REPO/server"

echo "==> [1/7] 检查 Homebrew"
if ! command -v brew >/dev/null 2>&1; then
  echo "未检测到 Homebrew，正在安装（需要输入 Mac 登录密码）…"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
# 兼容 Apple 芯片与 Intel 的 brew 路径
eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv 2>/dev/null || true)"
BREW_PREFIX="$(brew --prefix)"

echo "==> [2/7] 安装 Node 与 PostgreSQL"
brew list node >/dev/null 2>&1 || brew install node
brew list postgresql@16 >/dev/null 2>&1 || brew install postgresql@16
brew list ffmpeg >/dev/null 2>&1 || brew install ffmpeg   # 视频号工厂真实出片引擎
export PATH="$BREW_PREFIX/opt/postgresql@16/bin:$PATH"
brew services start postgresql@16 >/dev/null 2>&1 || true
sleep 3

echo "==> [3/7] 创建数据库 waimao"
createdb waimao 2>/dev/null && echo "  已创建数据库 waimao" || echo "  数据库 waimao 已存在，跳过"
DB_USER="$(whoami)"

echo "==> [4/7] 生成配置 server/.env"
ENV_FILE="$SERVER_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  cp "$SERVER_DIR/.env.example" "$ENV_FILE"
  JWT="$(openssl rand -hex 32)"
  # 用本机 Postgres（本地 trust 认证，无需密码）
  /usr/bin/sed -i '' "s#^JWT_SECRET=.*#JWT_SECRET=$JWT#" "$ENV_FILE"
  /usr/bin/sed -i '' "s#^DATABASE_URL=.*#DATABASE_URL=postgres://$DB_USER@localhost:5432/waimao#" "$ENV_FILE"
  echo "  已生成 $ENV_FILE（含随机 JWT_SECRET 与本机数据库地址）"
  echo "  ⚠️  请稍后编辑它，至少改 ADMIN_EMAIL / ADMIN_PASSWORD，并按需填大模型/邮箱等 key。"
else
  echo "  $ENV_FILE 已存在，保留你现有的配置"
fi

echo "==> [5/7] 安装后端依赖"
( cd "$SERVER_DIR" && npm install --omit=dev --no-audit --no-fund )

echo "==> [6/7] 配置开机自启（launchd，掉线/重启自动拉起）"
NODE_BIN="$(command -v node)"
PLIST="$HOME/Library/LaunchAgents/com.waimao.fulllink.plist"
mkdir -p "$HOME/Library/LaunchAgents" "$SERVER_DIR/logs"
cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.waimao.fulllink</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$SERVER_DIR/src/index.js</string>
  </array>
  <key>WorkingDirectory</key><string>$SERVER_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$SERVER_DIR/logs/app.log</string>
  <key>StandardErrorPath</key><string>$SERVER_DIR/logs/app.err.log</string>
</dict>
</plist>
PLIST_EOF
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load -w "$PLIST"
echo "  已设置开机自启并启动服务"

echo "==> [7/7] 完成"
sleep 3
PORT="$(grep -E '^PORT=' "$ENV_FILE" | cut -d= -f2)"; PORT="${PORT:-8080}"
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo '你的Mac局域网IP')"
if curl -fsS "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
  echo ""
  echo "✅ 部署成功！"
  echo "   本机访问：       http://localhost:$PORT"
  echo "   同一WiFi的同事：  http://$LAN_IP:$PORT"
  echo ""
  echo "下一步："
  echo "  1) 编辑 $ENV_FILE 设置管理员账号密码与各 API key，然后："
  echo "       launchctl unload \"$PLIST\" && launchctl load -w \"$PLIST\"   # 重启生效"
  echo "  2) 用管理员账号登录，进「管理后台」创建其余 9 个员工账号。"
  echo "  3) 让 Mac mini 不休眠：系统设置 > 节能，勾选「防止自动进入睡眠」；"
  echo "     并勾选「断电后自动重启」。远程/异地访问见《Mac-mini-部署指南.md》。"
else
  echo "❌ 启动检查失败，请查看日志：$SERVER_DIR/logs/app.err.log"
  exit 1
fi
