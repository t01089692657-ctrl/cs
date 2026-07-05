# 用 Mac mini 当服务器 · 部署指南

Mac mini 完全可以当这套系统的服务器，应用和数据库都跑在它上面，10 个同事用浏览器访问它即可。
下面是最省心的做法。

---

## 一、最快上线（原生安装，不用 Docker，推荐）

在 Mac mini 上：

1. 装 Git 并把代码拉下来（终端里执行）：
   ```bash
   git clone <你的仓库地址> cs
   cd cs
   ```
2. 一键部署（自动装 Node + PostgreSQL、建库、配置、设为开机自启）：
   ```bash
   bash deploy/mac-setup.sh
   ```
3. 按提示编辑 `server/.env` 设管理员账号密码、填大模型/邮箱等 key，然后重启服务：
   ```bash
   launchctl unload ~/Library/LaunchAgents/com.waimao.fulllink.plist
   launchctl load  -w ~/Library/LaunchAgents/com.waimao.fulllink.plist
   ```

脚本结束会打印两个地址：
- 本机：`http://localhost:8080`
- 同一 WiFi 的同事：`http://<Mac的局域网IP>:8080`

> `server/.env` 里各项 key「填了就真实生效，没填就演示」，可以分批填，随时可用。

---

## 二、让 Mac mini 稳定当服务器

- **不休眠**：系统设置 → 节能 →「防止电脑自动进入睡眠」打开（合盖无关，Mac mini 无盖）。
- **断电自动重启**：系统设置 → 节能 →「断电后自动重新启动」打开。
- **开机自动进系统**：系统设置 → 用户与群组 → 自动登录，设为服务器账号（这样重启后 launchd 会自动拉起服务）。
- **防火墙放行**：首次运行若弹「是否允许 node 接受连接」，选「允许」，否则同事连不上。
- 服务已由 launchd 常驻，崩了会自动重启；日志在 `server/logs/app.log`。

---

## 三、同事怎么访问（按场景选）

**场景 A：同事都在同一间办公室（同一路由器/WiFi）** —— 最简单
直接用局域网地址 `http://<Mac的局域网IP>:8080`。
建议给 Mac mini 设固定局域网 IP（路由器里绑定 MAC 地址），免得重启后 IP 变。

**场景 B：同事在不同地点/在家也要用** —— Mac mini 在家庭/办公宽带后面没有公网 IP，二选一：
- **Tailscale（推荐，免费、最省事）**：Mac mini 和每个同事的电脑都装 Tailscale 登录同一账号，
  就像在同一个内网，用 Tailscale 分配的地址访问 `http://<tailscale-IP>:8080`。不用改路由器。
- **Cloudflare Tunnel（想要固定网址+HTTPS）**：在 Mac mini 装 `cloudflared`，
  把 `localhost:8080` 映射到你的域名（如 `crm.你的公司.com`），同事用网址访问，自带 HTTPS。

---

## 四、数据备份（重要）

数据都在本机 PostgreSQL，建议定期备份，防 Mac mini 故障：
```bash
# 手动备份一次（导出到桌面）
pg_dump waimao > ~/Desktop/waimao-$(date +%Y%m%d).sql
```
可以把这条命令加到「系统设置 → 通用 → 隔空投送与接力」之外的定时任务里，
或用 `crontab -e` 设每天自动备份。也建议顺手用 Mac 的「时间机器」做整机备份。

---

## 五、境内 Mac mini 访问海外 API（获客必看）

获客要抓 Google、找邮箱（Hunter/Apollo）、大模型等**海外服务**。如果 Mac mini 在**中国大陆**，
直连这些海外地址通常不通，需要让服务器的海外请求走代理：

1. 在 Mac mini 上装好你的科学上网工具，记下它的本机 HTTP 代理端口（常见 `7890`）。
2. 在 `server/.env` 里填：
   ```
   OUTBOUND_PROXY=http://127.0.0.1:7890
   ```
3. 重启服务（同上 launchctl 两条命令）。

这样获客抓取、找邮箱、大模型这些海外请求就会走代理；本地访问和局域网访问不受影响。
若 Mac mini 在海外或网络本身能直连 Google，则留空不填即可。

> 注意：微信视频号仍无公开发布 API，视频生成后需人工上传发布（系统里有「待发布」提醒）。

---

## 六、可选：用 Docker 而不是原生安装

如果你更熟悉 Docker：在 Mac mini 装 Docker Desktop，然后仓库根目录执行
```bash
cp server/.env.example server/.env   # 填好 key
bash deploy/deploy.sh
```
Apple 芯片（M 系列）注意：`docker-compose.yml` 里的 crawl4ai 若无 arm64 镜像会拉取失败，
按文件内注释取消 `platform: linux/amd64` 那行即可（用兼容模式，稍慢）。
一般更推荐原生安装 + 用 Firecrawl 做抓取，省得维护这个容器。

---

## 七、日常维护速查

| 操作 | 命令 |
|---|---|
| 看服务状态/日志 | `tail -f server/logs/app.log` |
| 改了 .env 后重启 | `launchctl unload ~/Library/LaunchAgents/com.waimao.fulllink.plist && launchctl load -w ~/Library/LaunchAgents/com.waimao.fulllink.plist` |
| 更新到新版本 | `git pull && cd server && npm install && `（再重启服务） |
| 备份数据 | `pg_dump waimao > ~/Desktop/waimao-$(date +%Y%m%d).sql` |
| 查本机局域网 IP | `ipconfig getifaddr en0` |

数据存放、API 清单见《上线部署清单.md》；获客引擎细节见《获客引擎-部署说明.md》；
通用架构见《部署指南.md》。
