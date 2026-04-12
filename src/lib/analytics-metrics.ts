import type { DashboardTask } from "@/lib/types";

/** 雷达图六轴标签（与计算顺序一致） */
export const ANALYTICS_METRIC_LABELS = [
  "任务完成率",
  "工作量达成",
  "信用分",
  "积分贡献",
  "协作活跃",
  "时效与责任"
] as const;

export type AnalyticsLog = {
  createdAt: string;
  user: { id: string };
};

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function teamBaselineCompletion(tasks: DashboardTask[]): number {
  const assigned = tasks.filter((t) => t.assignee);
  if (!assigned.length) return 60;
  const done = assigned.filter((t) => t.status === "DONE").length;
  return (done / assigned.length) * 100;
}

function workloadTimelinessScore(task: DashboardTask): number {
  if (task.status === "REALLOCATED") return 22;
  if (task.status === "DONE") return 95;
  if (task.warningLevel === "CRITICAL") return 38;
  if (task.warningLevel === "WARNING") return 62;
  return 88;
}

/**
 * 六维分数 0–100，均来自当前项目的任务、积分与操作日志。
 */
export function computeMemberRadarDimensions(
  memberId: string,
  member: { creditScore: number; accumulatedPoints: number },
  tasks: DashboardTask[],
  logs: AnalyticsLog[],
  teamMaxAccumulatedPoints: number,
  baselineCompletion: number
): number[] {
  const assigned = tasks.filter((t) => t.assignee?.id === memberId);
  const doneList = assigned.filter((t) => t.status === "DONE");
  const assignedPts = assigned.reduce((s, t) => s + t.workloadPoints, 0);
  const donePts = doneList.reduce((s, t) => s + t.workloadPoints, 0);

  const completionRate =
    assigned.length > 0 ? (doneList.length / assigned.length) * 100 : baselineCompletion;

  const workloadRate =
    assignedPts > 0 ? (donePts / assignedPts) * 100 : baselineCompletion;

  const credit = member.creditScore;

  const pointsNorm =
    teamMaxAccumulatedPoints > 0
      ? (member.accumulatedPoints / teamMaxAccumulatedPoints) * 100
      : member.accumulatedPoints > 0
        ? 100
        : 35;

  const myLogs = logs.filter((l) => l.user.id === memberId);
  const activity = clampScore(12 + myLogs.length * 6);

  const incomplete = assigned.filter((t) => t.status !== "DONE");
  const timeliness =
    incomplete.length > 0
      ? incomplete.reduce((sum, t) => sum + workloadTimelinessScore(t), 0) / incomplete.length
      : assigned.some((t) => t.status === "DONE")
        ? 92
        : baselineCompletion;

  return [
    clampScore(completionRate),
    clampScore(workloadRate),
    clampScore(credit),
    clampScore(pointsNorm),
    activity,
    clampScore(timeliness)
  ];
}

function inferMemberRole(
  memberId: string,
  tasks: DashboardTask[],
  logs: AnalyticsLog[],
  memberIndex: number,
  maxAssignedWorkload: number
): string {
  const myLoad = tasks
    .filter((t) => t.assignee?.id === memberId)
    .reduce((s, t) => s + t.workloadPoints, 0);
  if (maxAssignedWorkload > 0 && myLoad === maxAssignedWorkload) {
    return "主力承担";
  }
  const myLogCount = logs.filter((l) => l.user.id === memberId).length;
  const logCounts = new Map<string, number>();
  for (const l of logs) {
    logCounts.set(l.user.id, (logCounts.get(l.user.id) ?? 0) + 1);
  }
  const maxLogs = Math.max(1, ...logCounts.values());
  if (myLogCount >= maxLogs && myLogCount >= 3) {
    return "协同活跃";
  }
  return ["项目协同", "执行成员", "支持角色"][memberIndex % 3];
}

/** 根据近 7 天与更早的日志条数对比估算趋势（-10～10） */
export function computeActivityTrendPct(memberId: string, logs: AnalyticsLog[], nowMs: number): number {
  const mine = logs.filter((l) => l.user.id === memberId);
  if (mine.length < 2) return 0;

  const week = 7 * 24 * 60 * 60 * 1000;
  let recent = 0;
  let older = 0;
  for (const l of mine) {
    const t = new Date(l.createdAt).getTime();
    if (Number.isNaN(t)) continue;
    if (nowMs - t < week) recent += 1;
    else older += 1;
  }
  if (recent === 0 && older === 0) return 0;
  const base = Math.max(1, older);
  const raw = ((recent - older) / base) * 12;
  return Math.max(-10, Math.min(10, Number(raw.toFixed(1))));
}

export type AnalyticsMemberInput = {
  id: string;
  name: string;
  accumulatedPoints: number;
  creditScore: number;
  projectRole?: string;
};

export type AnalyticsProfile = {
  id: string;
  name: string;
  role: string;
  totalScore: number;
  trendPct: number;
  dimensions: number[];
};

export function buildAnalyticsProfiles(
  members: AnalyticsMemberInput[],
  tasks: DashboardTask[],
  logs: AnalyticsLog[],
  nowMs: number = Date.now()
): AnalyticsProfile[] {
  const baseline = teamBaselineCompletion(tasks);
  const teamMaxPts = Math.max(0, ...members.map((m) => m.accumulatedPoints));

  const maxAssignedWorkload = Math.max(
    0,
    ...members.map((m) =>
      tasks.filter((t) => t.assignee?.id === m.id).reduce((s, t) => s + t.workloadPoints, 0)
    )
  );

  return members.map((member, index) => {
    const dimensions = computeMemberRadarDimensions(
      member.id,
      member,
      tasks,
      logs,
      teamMaxPts,
      baseline
    );
    const totalScore = Math.round(dimensions.reduce((a, b) => a + b, 0) / dimensions.length);
    const trendPct = computeActivityTrendPct(member.id, logs, nowMs);
    const role =
      member.projectRole === "OWNER"
        ? "队长 · 项目协调"
        : inferMemberRole(member.id, tasks, logs, index, maxAssignedWorkload);

    return {
      id: member.id,
      name: member.name,
      role,
      totalScore,
      trendPct,
      dimensions
    };
  });
}
