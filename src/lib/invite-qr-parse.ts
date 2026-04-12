/**
 * 从扫码结果解析邀请码：支持完整首页链接（含 ?invite=）、或纯邀请码文本。
 */
export function parseInviteFromScan(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const u = t.includes("://") ? new URL(t) : new URL(t, base);
    const inv = u.searchParams.get("invite")?.trim();
    if (inv) return inv;
  } catch {
    /* 非 URL */
  }

  if (/^FUSION-\d{4}$/i.test(t)) return t.toUpperCase();
  if (/^[A-Za-z0-9_-]{4,40}$/.test(t)) return t;
  return null;
}
