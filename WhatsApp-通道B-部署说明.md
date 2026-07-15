# WhatsApp 通道B（协议/网页版）部署说明

通道B = 扫码把你**现有的 WhatsApp 号**挂到系统里（相当于 WhatsApp 网页版），
续用历史会话，销售在国内浏览器直接收发，**无需各自开 VPN**。
适合**老客户 1 对 1 维护、低量沟通**。

> ⚠️ 这是非官方协议接入，违反 WhatsApp 服务条款、**有封号风险**。
> 系统已内置发送限速；请勿群发、勿高频主动触达。规模化主动触达请用通道A（官方 API）。

---

## 一、三种模式

`server/.env` 里的 `WHATSAPP_CHANNEL`：

| 值 | 含义 |
|---|---|
| `off`（默认） | 关闭，WhatsApp 工作台显示演示会话 |
| `demo` | 桩演示：假二维码/假会话，用于本机联调，不真连 |
| `baileys` | **真实协议直连**：扫码挂现有号、真实收发 |

---

## 二、在 Mac 上启用真实直连（baileys）

1. 装依赖（在项目的 `server` 目录）：
   ```bash
   cd server
   npm i @whiskeysockets/baileys qrcode
   # 若 Mac 在境内、需经代理连 WhatsApp，再装：
   npm i https-proxy-agent socks-proxy-agent
   ```
2. 编辑 `server/.env`：
   ```
   WHATSAPP_CHANNEL=baileys
   # 境内 Mac 必填：本机科学上网的代理端口（WhatsApp 被墙，服务器需出海线路）
   OUTBOUND_PROXY=http://127.0.0.1:7890
   # 可选：调发送限速（毫秒/条，默认 8000）
   WHATSAPP_MIN_SEND_GAP_MS=8000
   ```
3. 重启服务（launchd）：
   ```bash
   launchctl unload ~/Library/LaunchAgents/com.waimao.fulllink.plist
   launchctl load  -w ~/Library/LaunchAgents/com.waimao.fulllink.plist
   ```
4. 登录系统 → 左侧「WhatsApp 工作台」→ 点「扫码连接 WhatsApp」→
   **手机 WhatsApp → 设置 → 已连接的设备 → 连接设备 → 扫码**。
   连上后现有会话会同步过来，可直接收发。

---

## 三、原理：为什么"不用开 VPN"

WhatsApp 在境内被墙，没有魔法能免翻墙。真相是：**翻墙的活儿在服务器（Mac）上做，不在员工电脑上**。
WhatsApp 连接由 Mac 通过 `OUTBOUND_PROXY` 出海维持，员工浏览器只连你自己的系统（境内可达）。
所以 Mac 自己需要一条出海线路；员工端什么都不用装。

---

## 四、降低封号风险（务必遵守）

- **只做 1 对 1 老客户维护**，不群发、不批量主动加人。
- 系统已限速（默认 8 秒/条），别去调太低。
- 新号/刚注册的号不要马上上量；用**养了一段时间、平时正常用**的号。
- 一个号别同时在太多设备登录。
- 真要规模化主动触达 → 走**通道A 官方 WhatsApp Business API**（合规、按对话计费）。

---

## 五、常见问题

- **扫码后一直连接中/掉线**：多半是 Mac 的出海线路不通。确认 `OUTBOUND_PROXY` 端口对、代理软件开着、能正常访问 Google。
- **提示"未安装 baileys"**：按第二步装依赖并重启。
- **发送提示"发送过快"**：这是防封限速，等几秒再发即可。
- **换号**：工作台点「断开」→ 重新扫码。

> 本沙箱/演示环境无法联网到 WhatsApp，真实扫码与收发请在你的 Mac 上验证。
> 后端接口：`/api/whatsapp/{status,connect,logout,chats,messages,send}`，源码见
> `server/src/services/whatsapp.js` 与 `server/src/routes/whatsapp.js`。
