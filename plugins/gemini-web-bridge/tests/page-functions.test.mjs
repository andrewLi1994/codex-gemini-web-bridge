import assert from "node:assert/strict";
import test from "node:test";

import {
  cancelGeminiGeneration,
  inspectGeminiPage,
  readGeminiGenerationState,
  submitGeminiPrompt,
} from "../src/gemini-page.mjs";

test("page automation functions remain self-contained for CDP serialization", () => {
  assert.doesNotMatch(inspectGeminiPage.toString(), /\[native code\]/);
  assert.doesNotMatch(cancelGeminiGeneration.toString(), /\[native code\]/);
  assert.doesNotMatch(readGeminiGenerationState.toString(), /\[native code\]/);
  assert.doesNotMatch(submitGeminiPrompt.toString(), /\[native code\]/);
  assert.match(submitGeminiPrompt.toString(), /innerText.*!== prompt/s);
  assert.match(submitGeminiPrompt.toString(), /markerRendered/);
  assert.match(inspectGeminiPage.toString(), /signedOut/);
  assert.match(readGeminiGenerationState.toString(), /getClientRects/);
  assert.match(readGeminiGenerationState.toString(), /response-footer\.complete/);
  assert.match(readGeminiGenerationState.toString(), /RATE_LIMITED/);
  assert.match(readGeminiGenerationState.toString(), /INTERACTION_REQUIRED/);
});
