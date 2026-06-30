export class CdpClient {
  constructor(webSocketUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(webSocketUrl);
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => this.handleMessage(event));
    this.socket.addEventListener("close", () => {
      for (const pending of this.pending.values()) {
        pending.reject(new Error("Chrome 调试连接已关闭。"));
      }
      this.pending.clear();
    });
  }

  handleMessage(event) {
    const message = JSON.parse(String(event.data));
    if (message.id == null) return;
    const pending = this.pending.get(message.id);
    if (pending == null) return;
    this.pending.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error != null) pending.reject(new Error(message.error.message));
    else pending.resolve(message.result ?? {});
  }

  send(method, params = {}, timeoutMs = 30_000) {
    if (this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("Chrome 调试连接尚未建立。"));
    }
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Chrome 调试命令超时：${method}`));
      }, timeoutMs);
      this.pending.set(id, { reject, resolve, timer });
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      awaitPromise: true,
      expression,
      returnByValue: true,
    });
    if (result.exceptionDetails != null) {
      throw new Error(result.exceptionDetails.exception?.description ?? "Gemini 页面脚本执行失败。");
    }
    return result.result?.value;
  }

  async call(functionDeclaration, args = [], timeoutMs = 30_000) {
    const global = await this.send("Runtime.evaluate", {
      expression: "globalThis",
      returnByValue: false,
    });
    const objectId = global.result?.objectId;
    if (objectId == null) throw new Error("无法访问 Gemini 页面上下文。");
    const result = await this.send(
      "Runtime.callFunctionOn",
      {
        arguments: args.map((value) => ({ value })),
        awaitPromise: true,
        functionDeclaration,
        objectId,
        returnByValue: true,
      },
      timeoutMs,
    );
    if (result.exceptionDetails != null) {
      throw new Error(result.exceptionDetails.exception?.description ?? "Gemini 页面操作失败。");
    }
    return result.result?.value;
  }

  close() {
    this.socket.close();
  }
}
