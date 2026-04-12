"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type JoinMode = "id" | "invite";

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [memberNames, setMemberNames] = useState("");
  const [joinMode, setJoinMode] = useState<JoinMode>("invite");
  const [joinProjectId, setJoinProjectId] = useState("");
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<{ name: string; email: string | null } | null | undefined>(undefined);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSessionUser(d.user ?? null))
      .catch(() => setSessionUser(null))
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const code = new URLSearchParams(window.location.search).get("invite")?.trim();
    if (code) {
      setJoinInviteCode(code);
      setJoinMode("invite");
    }
  }, []);

  const isRegistered = Boolean(sessionUser?.email);

  async function createProject() {
    setError(null);
    if (!isRegistered) {
      setError("创建项目需先注册并登录。匿名身份仅用于加入他人项目。");
      return;
    }
    const t = title.trim();
    if (t.length < 2) {
      setError("请填写项目名称（至少 2 个字）");
      return;
    }
    if (!deadline) {
      setError("请选择项目截止时间");
      return;
    }
    const on = ownerName.trim();
    if (!on) {
      setError("请填写队长/创建者在项目中的显示昵称");
      return;
    }

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: t,
        deadline: new Date(deadline).toISOString(),
        ownerName: on,
        memberNames: memberNames
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
      })
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Create project failed");
      return;
    }

    router.push(`/project/${data.projectId}`);
  }

  async function joinProject() {
    setError(null);
    if (!authReady) {
      setError("请稍候，正在确认登录状态…");
      return;
    }

    const hasSession = Boolean(sessionUser);

    const base =
      joinMode === "id"
        ? { projectId: joinProjectId.trim() }
        : { inviteCode: joinInviteCode.trim() };

    if (joinMode === "invite" && !joinInviteCode.trim()) {
      setError("请填写队长提供的邀请码");
      return;
    }
    if (joinMode === "id" && !joinProjectId.trim()) {
      setError("请填写项目 ID");
      return;
    }

    if (!hasSession && !joinName.trim()) {
      setError("请先登录，或填写你的昵称后再加入");
      return;
    }

    const payload = hasSession ? base : { ...base, name: joinName.trim() };

    const res = await fetch("/api/projects/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Join failed");
      return;
    }

    router.push(`/project/${data.projectId}`);
  }

  return (
    <main className="min-h-screen bg-bg">
      <div className="shell mx-auto max-w-5xl pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-b border-line pb-4 text-sm">
          <p className="mr-auto max-w-xl text-muted">
            首次使用请先{" "}
            <Link href="/register" className="font-medium text-ink underline decoration-line hover:opacity-80">
              注册
            </Link>{" "}
            或{" "}
            <Link href="/login" className="font-medium text-ink underline decoration-line hover:opacity-80">
              登录
            </Link>
            ，便于跨项目使用同一账号；下面两栏分别为「新建项目」与「加入他人创建的项目」。
          </p>
          {!authReady ? (
            <span className="text-muted">登录状态加载中…</span>
          ) : sessionUser && isRegistered ? (
            <span className="text-ink">
              <span className="font-medium">{sessionUser.name}</span>
              <span className="ml-1 text-muted">({sessionUser.email})</span>
              <span className="mx-2 text-muted">·</span>
              <button
                type="button"
                className="font-medium text-ink underline decoration-line hover:opacity-80"
                onClick={() => void fetch("/api/auth/logout", { method: "POST" }).then(() => window.location.reload())}
              >
                退出
              </button>
            </span>
          ) : sessionUser ? (
            <span className="max-w-md text-right text-ink">
              <span className="font-medium">{sessionUser.name}</span>
              <span className="ml-1 text-muted">（匿名，未注册）</span>
              <span className="mx-2 text-muted">·</span>
              <button
                type="button"
                className="font-medium text-ink underline decoration-line hover:opacity-80"
                onClick={() => void fetch("/api/auth/logout", { method: "POST" }).then(() => window.location.reload())}
              >
                清除本机身份
              </button>
              <span className="mx-2 text-muted">·</span>
              <Link href="/register" className="font-medium text-ink underline decoration-line hover:opacity-80">
                注册
              </Link>
            </span>
          ) : (
            <div className="flex items-center gap-3 font-medium text-ink">
              <Link href="/login" className="rounded-full border border-line bg-white px-4 py-2 hover:bg-slate-50">
                登录
              </Link>
              <Link href="/register" className="rounded-full border border-ink bg-ink px-4 py-2 text-white hover:opacity-90">
                注册
              </Link>
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div className="shell mx-auto max-w-5xl pb-3">
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        </div>
      ) : null}

      <div className="shell mx-auto grid max-w-5xl gap-6 pb-8 md:grid-cols-2">
        <section className="line-card p-6">
          <h1 className="text-3xl font-semibold tracking-tight">Fusion Space MVP</h1>
          <p className="mt-2 text-sm text-muted">
            创建项目后你将成为队长，并可邀请成员、使用 AI 拆解任务与协作看板。
            <strong className="font-medium text-ink"> 必须先注册并登录</strong>
            ，系统不再为未登录访客自动创建「队长」账号。
          </p>

          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-xl border border-line px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="项目名称（必填）"
            />
            <div>
              <label className="mb-1 block text-xs text-muted">截止时间（必填）</label>
              <input className="w-full rounded-xl border border-line px-3 py-2" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <input
              className="w-full rounded-xl border border-line px-3 py-2"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="队长显示昵称（必填）"
            />
            <input
              className="w-full rounded-xl border border-line px-3 py-2"
              value={memberNames}
              onChange={(e) => setMemberNames(e.target.value)}
              placeholder="初始成员昵称，逗号分隔（可选，可稍后在项目里再加）"
            />
          </div>

          <button
            type="button"
            onClick={createProject}
            disabled={!isRegistered}
            className="mt-4 rounded-full border border-ink bg-ink px-4 py-2 text-sm font-medium text-white enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            创建项目
          </button>
          {!authReady ? null : !isRegistered ? (
            <p className="mt-2 text-sm text-muted">
              当前未处于已注册登录状态，无法创建项目。请先
              <Link href="/login" className="mx-1 font-medium text-ink underline decoration-line">
                登录
              </Link>
              或
              <Link href="/register" className="mx-1 font-medium text-ink underline decoration-line">
                注册
              </Link>
              ；若浏览器里残留匿名身份，可先点右上角「清除本机身份」。
            </p>
          ) : null}
        </section>

        <section className="line-card p-6">
          <h2 className="text-2xl font-semibold tracking-tight">加入项目</h2>
          <p className="mt-2 text-sm text-muted">
            此处<strong>不会</strong>列出任何现成项目。你必须向队长索取<strong>邀请码</strong>或<strong>项目 ID</strong>（对方在创建项目后可见），再在此输入；若队长分享的是链接（含{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">?invite=邀请码</code>
            ），打开后邀请码会自动填入。若无本机会话需填写昵称；已有会话（含匿名加入）可免填昵称。
          </p>

          <div className="mt-4 flex gap-2 rounded-xl border border-line bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setJoinMode("invite")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${joinMode === "invite" ? "bg-white shadow-sm" : "text-muted"}`}
            >
              邀请码
            </button>
            <button
              type="button"
              onClick={() => setJoinMode("id")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${joinMode === "id" ? "bg-white shadow-sm" : "text-muted"}`}
            >
              项目 ID
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {joinMode === "invite" ? (
              <input
                className="w-full rounded-xl border border-line px-3 py-2"
                value={joinInviteCode}
                onChange={(e) => setJoinInviteCode(e.target.value)}
                placeholder="队长提供的邀请码"
              />
            ) : (
              <input
                className="w-full rounded-xl border border-line px-3 py-2 font-mono text-sm"
                value={joinProjectId}
                onChange={(e) => setJoinProjectId(e.target.value)}
                placeholder="队长提供的项目 ID"
              />
            )}
            {sessionUser ? (
              <p className="text-sm text-muted">
                {isRegistered ? "已登录，加入时无需填写昵称。" : "当前为匿名身份，加入时无需填写昵称。"}
              </p>
            ) : (
              <input
                className="w-full rounded-xl border border-line px-3 py-2"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="你的昵称（未登录时必填）"
              />
            )}
          </div>
          <button
            type="button"
            onClick={joinProject}
            disabled={!authReady}
            className="mt-4 rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            加入项目
          </button>
        </section>
      </div>
    </main>
  );
}
