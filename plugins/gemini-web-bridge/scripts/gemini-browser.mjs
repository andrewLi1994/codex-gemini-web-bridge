import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

import { CdpClient } from "./cdp-client.mjs";
import {
  cancelGeminiGeneration,
  inspectGeminiPage,
  readGeminiGenerationState,
  submitGeminiPrompt,
} from "./gemini-page.mjs";
import { getSession, paths, saveSession } from "./state-store.mjs";
import { buildGeminiPrompt, canonicalizeYoutubeUrl } from "./youtube.mjs";

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];
const GEMINI_HOME = "https://gemini.google.com/app";
const ANSWER_TIMEOUT_MS = 3 * 60_000;
const NO_RESPONSE_TIMEOUT_MS = 90_000;
const STALLED_RESPONSE_TIMEOUT_MS = 45_000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class GeminiBridgeError extends Error {
  constructor(code, message, { partialChars = 0, retryable = false } = {}) {
    super(message);
    this.name = "GeminiBridgeError";
    this.code = code;
    this.partialChars = partialChars;
    this.retryable = retryable;
  }
}

function normalizeBridgeError(error) {
  if (error instanceof GeminiBridgeError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (/取消|aborted/i.test(message)) {
    return new GeminiBridgeError("CANCELLED", "Gemini 分析已取消。");
  }
  if (/连接已关闭|fetch failed|ECONN|WebSocket|socket/i.test(message)) {
    return new GeminiBridgeError(
      "BROWSER_DISCONNECTED",
      "后台浏览器连接意外断开。",
      { retryable: true },
    );
  }
  if (/没有开始生成/i.test(message)) {
    return new GeminiBridgeError(
      "NO_RESPONSE",
      "Gemini 已接收输入，但没有开始生成回答。",
      { retryable: true },
    );
  }
  if (/超时/i.test(message)) {
    return new GeminiBridgeError("BROWSER_TIMEOUT", message, { retryable: true });
  }
  if (/找不到 Gemini 输入框|找不到可用的 Gemini 发送按钮/i.test(message)) {
    return new GeminiBridgeError(
      "UI_CHANGED",
      "Gemini Web 页面结构可能已变化，Bridge 找不到输入或发送控件。",
    );
  }
  return new GeminiBridgeError("UNEXPECTED", message);
}

export function shouldRetryBridgeError(error, attempt, aborted = false) {
  return attempt === 0 && error?.retryable === true && !aborted;
}

async function fileExists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function fetchTargets(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
    signal: AbortSignal.timeout(1_500),
  });
  if (!response.ok) throw new Error(`Chrome 调试端点返回 ${response.status}`);
  return response.json();
}

async function fetchBrowserWebSocket(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
    signal: AbortSignal.timeout(1_500),
  });
  if (!response.ok) throw new Error(`Chrome 浏览器端点返回 ${response.status}`);
  const version = await response.json();
  if (typeof version.webSocketDebuggerUrl !== "string") {
    throw new Error("Chrome 浏览器端点缺少 WebSocket URL。");
  }
  return version.webSocketDebuggerUrl;
}

async function readActivePort() {
  try {
    const [line] = (await readFile(`${paths.profile}/DevToolsActivePort`, "utf8")).split("\n");
    const port = Number(line);
    return Number.isInteger(port) && port > 0 ? port : null;
  } catch {
    return null;
  }
}

export class GeminiBrowserBridge {
  async browserStatus() {
    const executable = await this.findBrowser();
    const port = await readActivePort();
    let connected = false;
    if (port != null) {
      try {
        await fetchTargets(port);
        connected = true;
      } catch {}
    }
    return {
      browserInstalled: executable != null,
      connected,
      executable,
      runtimeMode: "headless-per-task",
    };
  }

  async findBrowser() {
    for (const candidate of CHROME_CANDIDATES) {
      if (await fileExists(candidate)) return candidate;
    }
    return null;
  }

  async launchHumanLogin() {
    const executable = await this.findBrowser();
    if (executable == null) {
      throw new Error("没有找到兼容浏览器。本机版本暂未实现自动下载，请先安装 Google Chrome。");
    }
    await this.shutdownBrowser(await readActivePort());
    spawn(
      executable,
      [
        `--user-data-dir=${paths.profile}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--new-window",
        GEMINI_HOME,
      ],
      { detached: true, stdio: "ignore" },
    ).unref();
    return {
      profile: paths.profile,
      message: "请在打开的普通 Chrome 窗口登录 Gemini，确认能正常对话后关闭整个专用 Chrome 窗口。",
    };
  }

  async shutdownBrowser(port) {
    if (port == null) return;
    try {
      const client = new CdpClient(await fetchBrowserWebSocket(port));
      await client.connect();
      try {
        await client.send("Browser.close", {}, 5_000);
      } finally {
        client.close();
      }
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        try {
          await fetchTargets(port);
          await delay(200);
        } catch {
          break;
        }
      }
    } catch {}
  }

  async startBrowser() {
    await this.shutdownBrowser(await readActivePort());
    const executable = await this.findBrowser();
    if (executable == null) {
      throw new Error("没有找到兼容浏览器。本机版本暂未实现自动下载，请先安装 Google Chrome。");
    }
    spawn(
      executable,
      [
        `--user-data-dir=${paths.profile}`,
        "--headless=new",
        "--remote-debugging-address=127.0.0.1",
        "--remote-debugging-port=0",
        "--no-first-run",
        "--no-default-browser-check",
        "--window-size=1440,1000",
        "about:blank",
      ],
      { detached: true, stdio: "ignore" },
    ).unref();

    let port = null;
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      port = await readActivePort();
      if (port != null) {
        try {
          await fetchTargets(port);
          return port;
        } catch {}
      }
      await delay(250);
    }
    throw new Error("Chrome 已启动，但本机调试入口没有就绪。");
  }

  async openTarget(port) {
    const response = await fetch(
      `http://127.0.0.1:${port}/json/new?${encodeURIComponent("about:blank")}`,
      { method: "PUT", signal: AbortSignal.timeout(2_000) },
    );
    if (!response.ok) throw new Error("无法创建 Gemini 浏览器标签页。");
    const target = await response.json();
    const client = new CdpClient(target.webSocketDebuggerUrl);
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    return { client, target };
  }

  async waitForComposer(client, onProgress, signal, expectedUrl) {
    const deadline = Date.now() + 60_000;
    const expectedPath =
      expectedUrl === GEMINI_HOME ? null : new URL(expectedUrl).pathname.replace(/\/$/, "");
    let readyChecks = 0;
    while (Date.now() < deadline) {
      if (signal?.aborted) throw new Error("Gemini 分析已取消。");
      const page = await client.call(inspectGeminiPage.toString());
      if (page?.signedOut === true || /accounts\.google\.com/i.test(page?.url ?? "")) {
        throw new GeminiBridgeError(
          "LOGIN_REQUIRED",
          "请先调用 gemini_web_login，在普通 Chrome 中登录，关闭该专用窗口后重试。",
        );
      }
      if (
        page?.composerReady &&
        page.signedOut !== true &&
        /gemini\.google\.com/i.test(page.url) &&
        (expectedPath == null || new URL(page.url).pathname.replace(/\/$/, "") === expectedPath)
      ) {
        readyChecks += 1;
        if (readyChecks >= 4) return page;
      } else {
        readyChecks = 0;
      }
      await delay(750);
    }
    throw new GeminiBridgeError(
      "COMPOSER_TIMEOUT",
      "等待 Gemini 输入框超时；页面可能未完成加载。",
      { retryable: true },
    );
  }

  async waitForAnswer(client, before, onProgress, signal) {
    const startedAt = Date.now();
    const deadline = startedAt + ANSWER_TIMEOUT_MS;
    let lastChangedAt = startedAt;
    let lastText = "";
    let stableChecks = 0;
    let ticks = 0;
    while (Date.now() < deadline) {
      if (signal?.aborted) throw new Error("Gemini 分析已取消。");
      const state = await client.call(readGeminiGenerationState.toString(), [before]);
      if (state.failure?.kind === "RATE_LIMITED") {
        throw new GeminiBridgeError(
          "RATE_LIMITED",
          "Gemini Web 当前达到使用限额，请稍后再试或在专用登录窗口中检查账号额度。",
        );
      }
      if (state.failure?.kind === "INTERACTION_REQUIRED") {
        throw new GeminiBridgeError(
          "INTERACTION_REQUIRED",
          "Gemini 要求人工验证，请调用 gemini_web_login 完成验证后重试。",
        );
      }
      if (state.failure?.kind === "TRANSIENT") {
        throw new GeminiBridgeError(
          "GEMINI_TRANSIENT",
          "Gemini Web 显示临时生成错误。",
          { partialChars: lastText.length, retryable: true },
        );
      }
      if (state.isNew && state.snapshot.text === lastText) {
        stableChecks += 1;
      } else if (state.isNew) {
        stableChecks = 0;
        lastText = state.snapshot.text;
        lastChangedAt = Date.now();
      } else {
        stableChecks = 0;
      }
      ticks += 1;
      if (ticks % 8 === 0) {
        await onProgress?.(`Gemini 正在生成，已收到 ${lastText.length} 个字符。`, 50);
      }
      const completeByControls =
        state.isNew &&
        !state.stopVisible &&
        state.snapshot.completedCount > (before?.completedCount ?? 0);
      if (lastText.length > 0 && stableChecks >= 4 && completeByControls) {
        return { answer: lastText, conversationUrl: state.url };
      }
      if (!state.isNew && Date.now() - startedAt >= NO_RESPONSE_TIMEOUT_MS) {
        throw new GeminiBridgeError(
          "NO_RESPONSE",
          "Gemini 在 90 秒内没有返回任何回答。",
          { retryable: true },
        );
      }
      if (lastText.length > 0 && Date.now() - lastChangedAt >= STALLED_RESPONSE_TIMEOUT_MS) {
        throw new GeminiBridgeError(
          "RESPONSE_STALLED",
          `Gemini 回答停滞，已收到 ${lastText.length} 个字符但未完成。`,
          { partialChars: lastText.length, retryable: true },
        );
      }
      await delay(750);
    }
    throw new GeminiBridgeError(
      "GENERATION_TIMEOUT",
      `等待 Gemini 完整回答超过 3 分钟${lastText.length > 0 ? `；已收到 ${lastText.length} 个字符` : ""}。`,
      { partialChars: lastText.length, retryable: true },
    );
  }

  async runAttempt({ destination, language, question, reuseSession, signal, video }, onProgress) {
    let client = null;
    let completed = false;
    let port = null;
    try {
      port = await this.startBrowser();
      ({ client } = await this.openTarget(port));
      await client.send("Page.navigate", { url: destination });
      await this.waitForComposer(client, onProgress, signal, destination);
      if (reuseSession) await delay(4_000);
      const requestMarker = `GW-${crypto.randomUUID()}`;
      const prompt = `${buildGeminiPrompt({ language, question, url: video.url })}\n\n本地请求编号：${requestMarker}（无需在回答中重复）`;
      await onProgress?.("正在向 Gemini Web 提交问题。", 25);
      const submission = await client.call(
        submitGeminiPrompt.toString(),
        [prompt, requestMarker],
        30_000,
      );
      const result = await this.waitForAnswer(
        client,
        submission.before,
        onProgress,
        signal,
      );
      completed = true;
      return result;
    } catch (error) {
      throw normalizeBridgeError(error);
    } finally {
      if (client != null && !completed) {
        await client.call(cancelGeminiGeneration.toString(), [], 5_000).catch(() => {});
      }
      client?.close();
      await this.shutdownBrowser(port);
    }
  }

  async analyze({ language, question, signal, url }, onProgress) {
    const video = canonicalizeYoutubeUrl(url);
    const session = await getSession(video.videoId);
    await onProgress?.(
      session == null ? "正在新建 Gemini 视频会话。" : "正在打开已有视频会话。",
      5,
    );
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const reuseSession = attempt === 0 && session != null;
      const destination = reuseSession ? session.conversationUrl : GEMINI_HOME;
      try {
        const result = await this.runAttempt(
          { destination, language, question, reuseSession, signal, video },
          onProgress,
        );
        await saveSession(video.videoId, result.conversationUrl);
        await onProgress?.("Gemini Web 回答已完成，后台浏览器已关闭。", 100);
        return { ...result, video };
      } catch (error) {
        lastError = normalizeBridgeError(error);
        if (shouldRetryBridgeError(lastError, attempt, signal?.aborted)) {
          await onProgress?.(
            `Gemini 临时失败（${lastError.code}），正在用全新后台会话自动重试一次。`,
            60,
          );
          await delay(1_000);
          continue;
        }
        break;
      }
    }
    throw new GeminiBridgeError(
      lastError?.code ?? "UNEXPECTED",
      `${lastError?.message ?? "Gemini Web 分析失败。"}${lastError?.retryable ? " 已自动重试一次仍未恢复。" : ""}`,
      { partialChars: lastError?.partialChars ?? 0 },
    );
  }
}
