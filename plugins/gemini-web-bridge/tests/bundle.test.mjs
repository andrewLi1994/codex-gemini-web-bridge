import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("committed bundle starts as an MCP server without source imports", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(import.meta.dirname, "..", "dist", "mcp-server.mjs")],
    stderr: "pipe",
  });
  const client = new Client({ name: "bundle-smoke-test", version: "0.1.0" });
  try {
    await client.connect(transport);
    const result = await client.listTools();
    assert.deepEqual(
      result.tools.map(({ name }) => name).sort(),
      ["analyze_youtube", "gemini_web_authorize", "gemini_web_login", "gemini_web_status"],
    );
  } finally {
    await client.close();
  }
});
