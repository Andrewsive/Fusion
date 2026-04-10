"use client";

import { DashboardTask } from "@/lib/types";
import { TaskStatus } from "@/lib/domain";

const columns: TaskStatus[] = ["UNASSIGNED", "TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

export function TaskBoard({
  tasks,
  onMove
}: {
  tasks: DashboardTask[];
  onMove: (id: string, next: TaskStatus) => Promise<void>;
}) {
  function onDrop(next: TaskStatus, event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("taskId");
    if (!taskId) return;
    onMove(taskId, next);
  }

  return (
    <section className="line-card p-4">
      <h3 className="mb-3 text-xl font-semibold">Kanban</h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {columns.map((column) => (
          <div
            key={column}
            className="rounded-xl border border-line bg-slate-50 p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(column, e)}
          >
            <div className="mb-2 text-sm font-semibold text-muted">{column}</div>
            <div className="space-y-2">
              {tasks
                .filter((task) => task.status === column)
                .map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
                    className="rounded-lg border border-line bg-white p-2 text-sm"
                  >
                    <div className="font-medium">{task.title}</div>
                    <div className="mt-1 text-xs text-muted">{task.assignee?.name ?? "Unassigned"} · {task.workloadPoints} pts</div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
