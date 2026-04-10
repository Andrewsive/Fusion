import { AlertCountdownBadge } from "@/components/alert-countdown-badge";
import { DashboardData, DashboardTask } from "@/lib/types";

export function ProjectHero({
  project,
  activeTask,
  title,
  subtitle
}: {
  project: DashboardData["project"];
  activeTask?: DashboardTask | null;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight">{title ?? project.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>Deadline: {new Date(project.deadline).toLocaleString()}</span>
            {activeTask ? <AlertCountdownBadge level={activeTask.warningLevel} /> : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-2 text-sm text-muted">Invite: {project.inviteCode}</span>
          <button type="button" className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white">
            Share
          </button>
        </div>
      </div>
      <p className="mt-4 max-w-3xl text-base text-muted">{subtitle ?? project.contextSummary}</p>
    </section>
  );
}
