"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useState } from "react";
import QRCode from "qrcode";

type Props = {
  inviteCode: string;
};

export function ProjectInviteShare({ inviteCode }: Props) {
  const dialogId = useId();
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  const joinUrl =
    origin && inviteCode ? `${origin.replace(/\/$/, "")}/?invite=${encodeURIComponent(inviteCode.trim())}` : "";

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    if (!open || !joinUrl) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(joinUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" }
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [open, joinUrl]);

  const copyLink = useCallback(async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [joinUrl]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void copyLink()}
          disabled={!joinUrl}
          className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? "已复制链接" : "复制邀请链接"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          二维码
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${dialogId}-title`}
            className="line-card max-w-sm rounded-2xl border border-line bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={`${dialogId}-title`} className="text-lg font-semibold text-ink">
              扫码加入项目
            </h2>
            <p className="mt-2 text-sm text-muted">用手机扫描后打开首页，邀请码已预填，可直接加入。</p>
            <div className="mt-4 flex justify-center rounded-xl border border-line bg-slate-50 p-4">
              {qrDataUrl ? (
                <Image
                  src={qrDataUrl}
                  width={200}
                  height={200}
                  alt="邀请链接二维码"
                  unoptimized
                  className="h-[200px] w-[200px]"
                />
              ) : (
                <div className="flex h-[200px] w-[200px] items-center justify-center text-sm text-muted">生成中…</div>
              )}
            </div>
            <p className="mt-3 break-all font-mono text-xs text-muted">{joinUrl}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                复制链接
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-ink bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
