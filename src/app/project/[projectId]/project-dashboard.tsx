"use client";

import { useMemo, useState } from "react";
import { TopNav } from "@/components/top-nav";
import { TaskStreamCard } from "@/components/task-stream-card";
import { ReallocateDialog } from "@/components/reallocate-dialog";
import { AIMessagePanel } from "@/components/ai-message-panel";
import { ContributionPanel } from "@/components/contribution-panel";
import { DashboardTask } from "@/lib/types";
import { TaskBoard } from "@/components/task-board";
import { ProjectTabs } from "@/components/project-tabs";
import { ProjectHero } from "@/components/project-hero";
import { useProjectDashboard } from "@/lib/use-project-dashboard";

type Props = {
  projectId: string;
};

export function ProjectDashboard({ projectId }: Props) {
  const { data, error, refresh } = useProjectDashboard(projectId);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [reallocateTask, setReallocateTask] = useState<DashboardTask | null>(null);

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
    await refresh();
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
    await refresh();
  }

  async function parseContext(text: string) {
    await fetch(`/api/projects/${projectId}/ai-parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirementText: text })
    });
    await refresh();
  }

  async function generateTasks(text: string) {
    await fetch(`/api/projects/${projectId}/tasks/ai-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirementText: text })
    });
    await refresh();
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

  return (
    <main className="min-h-screen bg-bg">
      <TopNav />
      <div className="shell py-6">
        <ProjectHero
          project={data.project}
          activeTask={selectedTask}
          title={data.project.title}
          subtitle="Transparent progress, quantified workload, and automatic intervention."
        />
        <ProjectTabs projectId={projectId} />

        <div className="mb-4 grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <TaskBoard tasks={data.tasks} onMove={changeStatus} />
          <div className="space-y-4">
            <AIMessagePanel onGenerate={generateTasks} onParse={parseContext} onExtractFile={extractFile} />
            <ContributionPanel members={data.members} />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-3">
            {data.tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedTaskId(task.id)}
                className="block w-full text-left"
              >
                <TaskStreamCard task={task} onMove={changeStatus} onReallocate={handleReallocate} />
              </button>
            ))}
          </section>

          <section className="line-card p-6">
            <h3 className="mb-4 text-2xl font-semibold">Intervention Log</h3>
            <div className="space-y-3">
              {data.logs.slice(0, 8).map((log, index) => (
                <div
                  key={log.id}
                  className={`rounded-2xl border px-5 py-4 text-base ${
                    index % 2 === 0
                      ? "border-red-100 bg-red-50 text-red-500"
                      : "border-emerald-100 bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {index % 2 === 0 ? "[系统预警]" : "[进度播报]"} {log.description}
                </div>
              ))}
            </div>
          </section>
        </div>
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
