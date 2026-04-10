"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/top-nav";
import { SectionList } from "@/components/section-list";
import { TaskStreamCard } from "@/components/task-stream-card";
import { ReallocateDialog } from "@/components/reallocate-dialog";
import { AIMessagePanel } from "@/components/ai-message-panel";
import { ContributionPanel } from "@/components/contribution-panel";
import { DashboardData, DashboardTask } from "@/lib/types";
import { AlertCountdownBadge } from "@/components/alert-countdown-badge";
import { TaskBoard } from "@/components/task-board";

type Props = {
  projectId: string;
};

export function ProjectDashboard({ projectId }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [reallocateTask, setReallocateTask] = useState<DashboardTask | null>(null);

  const fetchDashboard = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/dashboard`, { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.error || "Failed to load dashboard");
      return;
    }

    setData(payload);
    setError(null);
  }, [projectId]);

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(fetchDashboard, 15000);
    return () => clearInterval(timer);
  }, [fetchDashboard]);

  const selectedTask = useMemo(() => {
    if (!data?.tasks.length) return null;
    return data.tasks.find((task) => task.id === selectedTaskId) ?? data.tasks[0];
  }, [data?.tasks, selectedTaskId]);

  async function changeStatus(taskId: string, status: DashboardTask["status"]) {
    await fetch(`/api/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await fetchDashboard();
  }

  async function handleReallocate(taskId: string) {
    const task = data?.tasks.find((item) => item.id === taskId);
    if (!task) return;
    setReallocateTask(task);
  }

  async function confirmReallocate() {
    if (!reallocateTask) return;
    await fetch(`/api/tasks/${reallocateTask.id}/reallocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    setReallocateTask(null);
    await fetchDashboard();
  }

  async function parseContext(text: string) {
    await fetch(`/api/projects/${projectId}/ai-parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirementText: text })
    });
    await fetchDashboard();
  }

  async function generateTasks(text: string) {
    await fetch(`/api/projects/${projectId}/tasks/ai-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirementText: text })
    });
    await fetchDashboard();
  }

  async function extractFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/ai/extract", {
      method: "POST",
      body: formData
    });
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload.error || "File extraction failed");
    }
    return payload.text || "";
  }

  if (error) {
    return (
      <main className="min-h-screen bg-white p-8">
        <p className="text-critical">{error}</p>
      </main>
    );
  }

  if (!data) {
    return <main className="min-h-screen bg-white p-8">Loading...</main>;
  }

  const sectionItems = data.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    subtitle: `${task.assignee?.name ?? "Unassigned"} · ${task.workloadPoints} pts`
  }));

  return (
    <main className="min-h-screen bg-bg">
      <TopNav />
      <div className="shell grid gap-6 py-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <section>
            <h1 className="text-5xl font-semibold leading-tight tracking-tight">{data.project.title}</h1>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted">
              <span>Deadline: {new Date(data.project.deadline).toLocaleString()}</span>
              {selectedTask ? <AlertCountdownBadge level={selectedTask.warningLevel} /> : null}
            </div>
            <div className="line-card mt-4 p-4">
              <div className="text-sm font-medium">Project overview</div>
              <p className="mt-2 text-sm text-muted">{data.project.contextSummary}</p>
              <div className="mt-3 text-xs text-muted">Invite code: {data.project.inviteCode}</div>
            </div>
          </section>

          <SectionList title="Task Sections" items={sectionItems} activeId={selectedTask?.id} onSelect={setSelectedTaskId} />

          <section className="line-card p-4">
            <h3 className="text-2xl font-semibold">Files</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>PDF requirement</li>
              <li>Project brief</li>
            </ul>
          </section>

          <ContributionPanel members={data.members} />
        </aside>

        <section className="space-y-4">
          <div className="line-card p-4">
            <h2 className="text-4xl font-semibold tracking-tight">Task Workspace</h2>
            <p className="mt-2 text-base text-muted">Transparent progress, quantified workload, and automatic intervention.</p>
          </div>

          <TaskBoard tasks={data.tasks} onMove={changeStatus} />

          <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            <div className="space-y-3">
              {data.tasks.map((task) => (
                <TaskStreamCard key={task.id} task={task} onMove={changeStatus} onReallocate={handleReallocate} />
              ))}
            </div>

            <div className="space-y-4">
              <AIMessagePanel onGenerate={generateTasks} onParse={parseContext} onExtractFile={extractFile} />

              <section className="line-card p-4">
                <h3 className="text-xl font-semibold">Intervention Log</h3>
                <ol className="mt-3 space-y-2 text-sm">
                  {data.logs.slice(0, 8).map((log, index) => (
                    <li key={log.id}>
                      <span className="mr-2 font-semibold">{index + 1}.</span>
                      {log.description}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </div>
        </section>
      </div>

      <ReallocateDialog
        open={Boolean(reallocateTask)}
        taskTitle={reallocateTask?.title ?? ""}
        onClose={() => setReallocateTask(null)}
        onConfirm={confirmReallocate}
      />
    </main>
  );
}
