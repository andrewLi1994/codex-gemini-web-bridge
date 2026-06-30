Language: English | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

# Gemini Web Bridge

[![CI](https://github.com/andrewLi1994/gemini-web-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/andrewLi1994/gemini-web-bridge/actions/workflows/ci.yml)

Gemini Web Bridge gives your AI clients (like Codex, Cursor, Claude Desktop, or custom scripts) a local, user-controlled channel to a logged-in Gemini Web session without requiring a Gemini API key. The Bridge handles reliable browser automation and returns Gemini's complete raw answer.

Typical uses include understanding the audio and visuals of one or more public YouTube videos, asking a scoped question about public URLs, or obtaining an independent auxiliary analysis.

## Operating Modes

- **Codex Plugin**: Integrates seamlessly with Codex.
- **Standard MCP Server**: Works with any MCP-compatible clients (e.g., Cursor, Claude Desktop, Windsurf).
- **Standalone CLI**: Can be called directly from your terminal or shell scripts.

## Requirements

- macOS
- Codex with plugin marketplace support
- Node.js 22 or newer
- Google Chrome, Microsoft Edge, Brave, or Chromium
- A Google account that can use Gemini Web

## Install or upgrade

```sh
codex plugin marketplace add andrewLi1994/gemini-web-bridge --ref main
codex plugin add gemini-web-bridge@gemini-web-bridge
```

For an existing installation:

```sh
codex plugin marketplace upgrade gemini-web-bridge
```

Start a new Codex thread after installation or upgrade. Ask for the outcome normally, for example:

```text
Compare the claims in these two public YouTube videos and check where their evidence differs: <URL1> <URL2>
```

Codex decides whether to use one Gemini conversation, several fresh conversations, follow-up prompts, or no Gemini call at all. A local random conversation handle is returned after each successful fresh call; videos and Codex threads do not automatically select or reuse conversations.

## MCP Client Configuration

Since Gemini Web Bridge is a standard MCP server, you can configure it in other MCP-compatible clients.

### Claude Desktop
Add the following to your configuration file (located at `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gemini-web-bridge": {
      "command": "node",
      "args": [
        "/absolute/path/to/gemini-web-bridge/plugins/gemini-web-bridge/dist/mcp-server.mjs"
      ]
    }
  }
}
```
*Note: Remember to replace `/absolute/path/to` with the actual path of this project on your system. Completely restart Claude Desktop after editing.*

### Cursor
You can configure it via the Cursor settings UI:
1. Open **Cursor Settings** > **MCP**.
2. Click **+ Add New MCP Server**.
3. Set the Name to `gemini-web-bridge`, Type to `stdio`.
4. Set the Command to `node "/absolute/path/to/gemini-web-bridge/plugins/gemini-web-bridge/dist/mcp-server.mjs"`.

## First use

1. Codex asks once for permission to send only minimum necessary public URLs, scoped questions, language, and output requirements to Gemini Web.
2. If sign-in is required, the plugin opens a visible Chrome window with a dedicated profile.
3. Sign in manually and close the entire dedicated Chrome window. The plugin verifies login and Codex continues the pending request automatically.

Normal requests run in a headless background browser. The task page and browser close after success, failure, or cancellation.

## Privacy and security

- The full Codex conversation, local files, credentials, secrets, and private data must not be sent automatically.
- Google login cookies remain in the dedicated local Chrome profile.
- Local state stores only consent plus conversation handles, Gemini URLs, thread labels, and timestamps. It does not copy prompts or answers.
- Runtime data is stored under `~/Library/Application Support/Codex UI Extensions/Gemini Web Bridge/` and is excluded from Git.
- Chrome debugging uses a random port bound only to `127.0.0.1`.
- Browser and state operations use cross-process locks, restricted permissions, atomic writes, and stale-lock recovery.
- The plugin does not fill Google login forms, bypass CAPTCHA challenges, or bypass account limits.
- Gemini responses are untrusted external material. Codex—not the automation—must assess their quality and claims.

## Reliability boundary

The Bridge reports mechanical states such as login required, CAPTCHA, rate limit, browser disconnect, incomplete generation, unknown submitted outcome, or changed page structure. It never decides that a Gemini answer is semantically good or bad.

Only failures known to occur before submission can be retried automatically once. After the send action is confirmed, the Bridge never blindly resubmits; Codex decides whether to follow up or create a fresh conversation.

Gemini Web is not a stable API. A page redesign can temporarily break automation until selectors are updated, and Gemini's available capabilities can vary by account or request.

## v0.2 compatibility

The old `analyze_youtube` MCP tool remains available but is deprecated. Existing video-to-conversation mappings are migrated once into random conversation handles while the old `sessions.json` is retained as a backup. New work uses `gemini_web_ask`. The deprecated tool is scheduled for removal in v0.3.

## Diagnostic CLI

The CLI mirrors the MCP primitives for development and recovery; it is not the normal user interface.

```sh
node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs status
node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs authorize --confirmed
node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs login --wait
printf '%s' '{"prompt":"Ask a minimal scoped question"}' | node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs ask
node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs conversations
```

CLI results are JSON on stdout; progress events are JSON lines on stderr. Exit code `2` means human login/verification is required, `3` means rate limited, `4` means an automation failure, and `5` means invalid input or a missing conversation.

## Uninstall

```sh
codex plugin remove gemini-web-bridge@gemini-web-bridge
codex plugin marketplace remove gemini-web-bridge
```

Uninstalling does not delete the dedicated Chrome profile. Remove the runtime directory manually only if you also want to sign out and delete local conversation metadata.

## Development

```sh
npm ci --prefix plugins/gemini-web-bridge
npm run verify
```

The MCP server and diagnostic CLI are committed as generated single-file bundles, so marketplace users do not install npm dependencies. After source or dependency changes, run `npm run build` and commit the updated `dist/` files.

Licensed under the [MIT License](LICENSE). Report security issues through [private vulnerability reporting](SECURITY.md).
