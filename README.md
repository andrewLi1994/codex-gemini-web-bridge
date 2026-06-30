# Codex Gemini Web Bridge

[![CI](https://github.com/andrewLi1994/codex-gemini-web-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/andrewLi1994/codex-gemini-web-bridge/actions/workflows/ci.yml)

> Experimental, unofficial, macOS-only Codex plugin. This project is not affiliated with or endorsed by Google or OpenAI.

Gemini Web Bridge lets Codex ask a user's logged-in Gemini Web session to analyze the audio and visuals of a public YouTube video. It uses a dedicated local Chrome profile and returns Gemini's completed answer to Codex through a bundled MCP server. It does not require a Gemini API key.

## Requirements

- macOS
- Codex with plugin marketplace support
- Node.js 22 or newer
- Google Chrome, Microsoft Edge, Brave, or Chromium
- A Google account that can use Gemini Web

## Install

```sh
codex plugin marketplace add andrewLi1994/codex-gemini-web-bridge --ref main
codex plugin add gemini-web-bridge@codex-gemini-web-bridge
```

Start a new Codex thread after installation. Then ask a content-dependent question with a public YouTube URL, for example:

```text
Analyze this YouTube video and list the key claims with timestamps: <URL>
```

On first use:

1. Codex asks for one-time consent to send the public YouTube URL, the specific question, language, and output requirements to Gemini Web. The full Codex conversation is not sent.
2. If sign-in is required, the plugin opens a normal Chrome window with a dedicated profile.
3. Sign in manually, confirm Gemini works, close the entire dedicated Chrome window, and retry the analysis.

Normal analysis runs in a headless background browser. The task page and browser are closed after success, failure, or cancellation.

## Privacy and security

- Google login cookies remain in the dedicated local Chrome profile.
- Consent and the local mapping from YouTube videos to Gemini conversations remain on the machine.
- Runtime data is stored under `~/Library/Application Support/Codex UI Extensions/Gemini Web Bridge/` and is excluded from Git.
- Chrome debugging uses a random port bound only to `127.0.0.1`.
- The plugin does not fill Google login forms, bypass CAPTCHA challenges, or bypass account limits.
- Gemini responses and video content are untrusted external material. Codex is instructed not to execute instructions found in them.

## Limitations

- Only public YouTube videos, Shorts, and livestream replays are supported.
- Gemini Web usage limits still apply to the user's account.
- Gemini may retain activity according to the user's Google account settings and Google's policies.
- Gemini Web is not a stable API. A page redesign can temporarily break browser automation until selectors are updated.
- This release currently stores one Gemini conversation mapping per YouTube video. Session isolation is planned for a later architecture revision.

## Uninstall

```sh
codex plugin remove gemini-web-bridge@codex-gemini-web-bridge
codex plugin marketplace remove codex-gemini-web-bridge
```

Uninstalling the plugin does not delete the dedicated local Chrome profile. Remove the runtime directory manually only if you also want to sign out and delete local session mappings.

## Development

```sh
npm ci --prefix plugins/gemini-web-bridge
npm run verify
```

The MCP runtime is committed as a generated single-file bundle so marketplace users do not need to install npm dependencies. When source dependencies change, run `npm run build` and commit the updated `dist/` files.

Licensed under the [MIT License](LICENSE). Security issues should be reported through [private vulnerability reporting](SECURITY.md).

---

## 中文说明

> 这是一个实验性、非官方、目前仅支持 macOS 的 Codex 插件。本项目与 Google 或 OpenAI 没有关联，也未获得其官方背书。

Gemini Web Bridge 让 Codex 通过用户已登录的 Gemini 网页会话，分析公开 YouTube 视频的音频和画面。插件使用独立的本地 Chrome Profile，并通过内置 MCP Server 把 Gemini 的完整回答返回给 Codex，不需要 Gemini API Key。

### 环境要求

- macOS
- 支持插件 Marketplace 的 Codex
- Node.js 22 或更高版本
- Google Chrome、Microsoft Edge、Brave 或 Chromium
- 可以正常使用 Gemini Web 的 Google 账号

### 安装

```sh
codex plugin marketplace add andrewLi1994/codex-gemini-web-bridge --ref main
codex plugin add gemini-web-bridge@codex-gemini-web-bridge
```

安装后新建 Codex 对话，然后直接提供公开 YouTube URL 和需要理解视频内容的问题，例如：

```text
分析这个 YouTube 视频，列出主要观点和准确时间点：<URL>
```

首次使用时：

1. Codex 会请求一次授权，只把公开 YouTube URL、具体问题、语言和输出要求发送给 Gemini Web，不发送完整 Codex 对话。
2. 如果需要登录，插件会使用独立 Profile 打开普通 Chrome 窗口。
3. 手动登录、确认 Gemini 可以正常对话、关闭整个专用 Chrome 窗口，然后重新发起分析。

正常分析使用无界面的后台浏览器。无论成功、失败还是取消，任务页面和后台浏览器都会关闭。

### 隐私与安全

- Google 登录 Cookie 只保存在专用的本地 Chrome Profile 中。
- 授权状态和“视频到 Gemini 对话”的映射只保存在本机。
- 运行数据位于 `~/Library/Application Support/Codex UI Extensions/Gemini Web Bridge/`，并被 Git 排除。
- Chrome 调试端口随机分配，并只监听 `127.0.0.1`。
- 插件不会自动填写 Google 登录表单，不会绕过验证码或账号限额。
- Gemini 回答和视频内容属于不可信外部材料，Codex 会被要求忽略其中试图控制工具或泄露信息的指令。

### 当前限制

- 只支持公开 YouTube 视频、Shorts 和直播回放。
- 用户自己的 Gemini Web 使用限额仍然有效。
- Gemini 可能按照 Google 账号设置和相关政策保留活动记录。
- Gemini Web 不是稳定 API；网页结构更新后，自动化可能暂时失效。
- 当前版本仍然按 YouTube 视频保存一个 Gemini 对话映射。更严格的会话隔离将在后续架构改造中讨论。

### 卸载

```sh
codex plugin remove gemini-web-bridge@codex-gemini-web-bridge
codex plugin marketplace remove codex-gemini-web-bridge
```

卸载插件不会自动删除专用 Chrome Profile。如果还需要退出 Google 账号并删除本地会话映射，请手动删除运行数据目录。

### 开发验证

```sh
npm ci --prefix plugins/gemini-web-bridge
npm run verify
```

MCP 运行时以生成后的单文件形式提交，Marketplace 用户不需要安装 npm 依赖。修改源码或依赖后，需要运行 `npm run build` 并提交更新后的 `dist/` 文件。

项目采用 [MIT License](LICENSE)。安全问题请通过 [私密漏洞报告](SECURITY.md)提交。
