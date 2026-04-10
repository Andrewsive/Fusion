"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState("生态校园可持续发展计划");
  const [deadline, setDeadline] = useState(new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString().slice(0, 16));
  const [ownerName, setOwnerName] = useState("队长");
  const [memberNames, setMemberNames] = useState("小明,小红,李华");
  const [joinProjectId, setJoinProjectId] = useState("");
  const [joinName, setJoinName] = useState("新成员");
  const [error, setError] = useState<string | null>(null);

  async function createProject() {
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        deadline: new Date(deadline).toISOString(),
        ownerName,
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
    const res = await fetch(`/api/projects/${joinProjectId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: joinName })
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Join failed");
      return;
    }

    router.push(`/project/${joinProjectId}`);
  }

  return (
    <main className="min-h-screen bg-bg">
      <div className="shell mx-auto grid max-w-5xl gap-6 py-8 md:grid-cols-2">
        <section className="line-card p-6">
          <h1 className="text-3xl font-semibold tracking-tight">Fusion Space MVP</h1>
          <p className="mt-2 text-sm text-muted">Create project with AI-driven collaboration and anti-slacking workflow.</p>

          <div className="mt-4 space-y-3">
            <input className="w-full rounded-xl border border-line px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" />
            <input className="w-full rounded-xl border border-line px-3 py-2" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            <input className="w-full rounded-xl border border-line px-3 py-2" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Owner nickname" />
            <input className="w-full rounded-xl border border-line px-3 py-2" value={memberNames} onChange={(e) => setMemberNames(e.target.value)} placeholder="Members, separated by comma" />
          </div>

          <button type="button" onClick={createProject} className="mt-4 rounded-full border border-ink bg-ink px-4 py-2 text-sm font-medium text-white">
            Create Project
          </button>
        </section>

        <section className="line-card p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Join Existing Project</h2>
          <p className="mt-2 text-sm text-muted">No login required. Use project ID + nickname.</p>
          <div className="mt-4 space-y-3">
            <input className="w-full rounded-xl border border-line px-3 py-2" value={joinProjectId} onChange={(e) => setJoinProjectId(e.target.value)} placeholder="Project ID" />
            <input className="w-full rounded-xl border border-line px-3 py-2" value={joinName} onChange={(e) => setJoinName(e.target.value)} placeholder="Your nickname" />
          </div>
          <button type="button" onClick={joinProject} className="mt-4 rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Join
          </button>

          {error ? <p className="mt-4 text-sm text-critical">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}
