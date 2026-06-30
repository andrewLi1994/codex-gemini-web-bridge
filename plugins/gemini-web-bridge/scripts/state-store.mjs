import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const ROOT = join(
  homedir(),
  "Library",
  "Application Support",
  "Codex UI Extensions",
  "Gemini Web Bridge",
);

export const paths = {
  profile: join(ROOT, "Chrome Profile"),
  root: ROOT,
  sessions: join(ROOT, "sessions.json"),
  settings: join(ROOT, "settings.json"),
};

async function ensureRoot() {
  await mkdir(ROOT, { recursive: true, mode: 0o700 });
  await mkdir(paths.profile, { recursive: true, mode: 0o700 });
  await chmod(ROOT, 0o700).catch(() => {});
}

async function readJson(path, fallback) {
  await ensureRoot();
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(path, value) {
  await ensureRoot();
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, path);
  await chmod(path, 0o600).catch(() => {});
}

export async function authorizationStatus() {
  const settings = await readJson(paths.settings, {});
  return {
    authorized: settings.authorized === true,
    authorizedAt: typeof settings.authorizedAt === "string" ? settings.authorizedAt : null,
  };
}

export async function authorize() {
  const value = { authorized: true, authorizedAt: new Date().toISOString() };
  await writeJson(paths.settings, value);
  return value;
}

export async function getSession(videoId) {
  const sessions = await readJson(paths.sessions, {});
  const session = sessions[videoId];
  if (session == null || typeof session.conversationUrl !== "string") return null;
  return session;
}

export async function saveSession(videoId, conversationUrl) {
  if (!/^https:\/\/gemini\.google\.com\//i.test(conversationUrl)) return;
  const sessions = await readJson(paths.sessions, {});
  sessions[videoId] = { conversationUrl, lastUsedAt: new Date().toISOString() };
  await writeJson(paths.sessions, sessions);
}
