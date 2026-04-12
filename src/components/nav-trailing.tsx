"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Grid3X3, Search, UserCircle } from "lucide-react";

type Me = { id: string; name: string; email: string | null };

export function NavTrailing() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  const refresh = useCallback(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    window.location.href = "/";
  }

  return (
    <div className="flex items-center gap-4 text-muted">
      <Search className="h-5 w-5" />
      <Grid3X3 className="h-5 w-5" />
      {me === undefined ? (
        <UserCircle className="h-7 w-7 opacity-40" aria-hidden />
      ) : me ? (
        <div className="flex items-center gap-2 text-sm text-ink">
          <span className="max-w-[120px] truncate font-medium" title={me.email ?? me.name}>
            {me.name}
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-xs text-muted underline decoration-line hover:text-ink"
          >
            退出
          </button>
        </div>
      ) : (
        <Link href="/login" className="text-muted transition hover:text-ink" aria-label="Log in" title="Log in">
          <UserCircle className="h-7 w-7" />
        </Link>
      )}
    </div>
  );
}
