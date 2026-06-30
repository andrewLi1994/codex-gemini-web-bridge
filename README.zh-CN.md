Language: [English](README.md) | 简体中文 | [日本語](README.ja.md)

# Gemini Web Bridge

[![CI](https://github.com/andrewLi1994/gemini-web-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/andrewLi1994/gemini-web-bridge/actions/workflows/ci.yml)

Gemini Web Bridge 为您的 AI 客户端（如 Codex、Cursor、Claude Desktop 或自定义脚本）提供一个连接已登录 Gemini Web 的本地通道，不需要 Gemini API Key。Bridge 负责可靠的浏览器自动化，并直接返回 Gemini 的完整原始回答。

典型用途包括理解一个或多个公开 YouTube 视频的音频和画面、针对公共 URL 提出最小范围的问题，或者获得一份独立的辅助分析。

## 运行模式

- **Codex 插件**：与 Codex 无缝集成。
- **标准 MCP 服务**：兼容任何支持 MCP 协议的客户端（如 Cursor、Claude Desktop、Windsurf 等）。
- **独立 CLI 工具**：可在终端中直接运行或集成到您的 Shell 脚本中。

## 环境要求

- macOS
- 支持插件 Marketplace 的 Codex
- Node.js 22 或更高版本
- Google Chrome、Microsoft Edge、Brave 或 Chromium
- 可以正常使用 Gemini Web 的 Google 账号

## 安装或升级

```sh
codex plugin marketplace add andrewLi1994/gemini-web-bridge --ref main
codex plugin add gemini-web-bridge@gemini-web-bridge
```

已经安装时运行：

```sh
codex plugin marketplace upgrade gemini-web-bridge
```

安装或升级后新建 Codex 对话。用户只需要描述目标，例如：

```text
比较这两个公开 YouTube 视频的观点，并检查它们的证据有什么不同：<URL1> <URL2>
```

Codex 自行决定使用一个 Gemini 对话、多个全新对话、继续追问，或者完全不调用 Gemini。每次成功新建对话后都会返回一个本地随机句柄；视频和 Codex 线程不会自动选择或复用对话。

## MCP 客户端配置

由于 Gemini Web Bridge 是一个标准的 MCP 服务端，您可以在其他支持 MCP 协议的客户端中对其进行配置。

### Claude Desktop
将以下配置添加到您的配置文件中（路径为 `~/Library/Application Support/Claude/claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "gemini-web-bridge": {
      "command": "node",
      "args": [
        "/您的项目绝对路径/gemini-web-bridge/plugins/gemini-web-bridge/dist/mcp-server.mjs"
      ]
    }
  }
}
```
*注意：请将 `/您的项目绝对路径/` 替换为该项目在您本地文件系统中的真实绝对路径。保存配置后，必须完全重启 Claude Desktop 生效。*

### Cursor
您可以通过 Cursor 的图形界面直接进行配置：
1. 打开 **Cursor Settings** > **MCP**。
2. 点击 **+ Add New MCP Server**。
3. 设置 Name 为 `gemini-web-bridge`，Type 选择 `stdio`。
4. 设置 Command 为 `node "/您的项目绝对路径/gemini-web-bridge/plugins/gemini-web-bridge/dist/mcp-server.mjs"`。

## 首次使用

1. Codex 只请求一次授权，允许发送最少必要的公共 URL、具体问题、语言和输出要求。
2. 如果需要登录，插件使用专用 Profile 打开可见 Chrome 窗口。
3. 用户手动登录并关闭整个专用窗口。插件验证登录后，Codex 自动继续刚才的请求。

正常请求在无界面后台浏览器中运行。成功、失败或取消后都会关闭任务页面和浏览器。

## 隐私与安全

- 不得自动发送完整 Codex 对话、本地文件、凭据、密钥或私有数据。
- Google 登录 Cookie 只保存在专用本地 Chrome Profile 中。
- 本地只保存授权状态、随机对话句柄、Gemini URL、线程标签和时间，不复制问题或回答。
- 运行数据位于 `~/Library/Application Support/Codex UI Extensions/Gemini Web Bridge/`，并被 Git 排除。
- Chrome 调试使用随机端口，并只监听 `127.0.0.1`。
- 浏览器和状态操作使用跨进程锁、受限文件权限、原子写入和过期锁恢复。
- 插件不会自动填写 Google 登录表单，不会绕过验证码或账号限额。
- Gemini 回答是不可信外部材料，其质量和事实判断由 Codex 负责，而不是自动化脚本。

## 稳定性边界

Bridge 只报告机械状态，例如需要登录、验证码、额度限制、浏览器断连、生成未完成、提交结果未知或网页结构变化。它不会判断 Gemini 回答在语义上是否合格。

只有明确发生在提交前的失败才允许自动重试一次。确认点击发送后，Bridge 不会盲目重复提交；Codex 决定继续追问还是新建对话。

Gemini Web 不是稳定 API。页面改版可能暂时破坏自动化，Gemini 能力也可能因账号或请求而变化。

## v0.2 兼容性

旧 `analyze_youtube` MCP 工具仍然存在，但已经弃用。旧“视频到 Gemini 对话”映射会自动迁移为随机对话句柄，同时保留原 `sessions.json` 作为备份。新任务使用 `gemini_web_ask`。旧工具计划在 v0.3 删除。

## 诊断 CLI

CLI 只用于开发和故障恢复，不是普通用户入口：

```sh
node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs status
node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs authorize --confirmed
node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs login --wait
printf '%s' '{"prompt":"提出一个最小范围的问题"}' | node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs ask
node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs conversations
```

CLI 最终结果使用 stdout JSON，进度使用 stderr JSON Lines。退出码 `2` 表示需要人工登录或验证，`3` 表示额度限制，`4` 表示自动化失败，`5` 表示输入无效或对话不存在。

## 卸载

```sh
codex plugin remove gemini-web-bridge@gemini-web-bridge
codex plugin marketplace remove gemini-web-bridge
```

卸载不会删除专用 Chrome Profile。如果还需要退出 Google 账号并删除本地对话元数据，请手动删除运行 data 目录。

## 开发验证

```sh
npm ci --prefix plugins/gemini-web-bridge
npm run verify
```

MCP Server 和诊断 CLI 都以生成后的单文件提交，因此 Marketplace 用户不需要安装 npm 依赖。修改源码或依赖后，需要运行 `npm run build` 并提交更新后的 `dist/` 文件。

项目采用 [MIT License](LICENSE)。安全问题请通过 [私密漏洞报告](SECURITY.md)提交。
