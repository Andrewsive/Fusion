import OpenAI from "openai";

/** Default matches OpenAI SDK (10 minutes). Override if responses are slow. */
function resolveTimeoutMs(): number | undefined {
  const raw = process.env.OPENAI_TIMEOUT_MS;
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(Math.floor(n), 30 * 60 * 1000);
}

export function createOpenAIClient(): OpenAI {
  const timeout = resolveTimeoutMs();
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
    ...(timeout !== undefined ? { timeout } : {})
  });
}
