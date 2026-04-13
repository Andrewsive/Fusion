"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft } from "lucide-react";

import { TopNav } from "@/components/top-nav";
import { ProjectHero } from "@/components/project-hero";
import { useProjectDashboard } from "@/lib/use-project-dashboard";
import { ProjectAiChatPanel } from "@/components/project-ai-chat-panel";
import { ANALYTICS_METRIC_LABELS, buildAnalyticsProfiles } from "@/lib/analytics-metrics";
import type { AnalyticsProfile } from "@/lib/analytics-metrics";

const FALLBACK_NAMES = ["队长", "小明", "小红", "李华", "成员E", "成员F", "成员G", "成员H"];
const METRIC_WEIGHTS = ["25%", "20%", "15%", "15%", "15%", "10%"];
const SCORE_RULE_ITEMS = [
  {
    label: "任务质量",
    weight: "25%",
    description: "聚焦产出质量：可用性、逻辑完整性、评审通过/返工情况",
    source: "Task.status + ActionLog.actionType + ActionLog.description"
  },
  {
    label: "工作量达成",
    weight: "20%",
    description: "已完成工作量点数 / 已分配工作量点数",
    source: "Task.workloadPoints + Task.status"
  },
  {
    label: "过程投入",
    weight: "15%",
    description: "AI迭代、编辑与提交过程深度；zero-shot 行为降权",
    source: "ActionLog.actionType + ActionLog.description"
  },
  {
    label: "协作贡献",
    weight: "15%",
    description: "评审支持、跨任务协作、救火接管完成",
    source: "ActionLog + Task.isReallocated + Task.status"
  },
  {
    label: "时效责任",
    weight: "15%",
    description:
      "仅按逾期占比扣分（逾期时长 / 任务总时长）：0%=100；(0,10%]=80；(10%,25%]=65；(25%,50%]=45；(50%,100%]=30；>100%=20；被接管任务按最重记 20。",
    source: "Task.warningLevel + Task.status"
  },
  {
    label: "信用记录",
    weight: "10%",
    description: "成员长期履约信誉分（默认100），按时完成与有效协作可维持或小幅提升；逾期、被催告无响应、被接管、拒绝任务会扣分。",
    source: "User.creditScore"
  }
] as const;

const SHOWCASE_PROFILE_PRESET: Array<{
  name: string;
  role: string;
  trendPct: number;
  dimensions: number[];
}> = [
  {
    name: "队长",
    role: "项目协调",
    trendPct: 2.2,
    dimensions: [96, 95, 92, 94, 100, 98]
  },
  {
    name: "小明",
    role: "后端开发",
    trendPct: 1.8,
    dimensions: [92, 93, 88, 90, 100, 96]
  },
  {
    name: "小红",
    role: "前端开发",
    trendPct: 1.5,
    dimensions: [90, 91, 85, 88, 100, 95]
  },
  {
    name: "李华",
    role: "产品与文档",
    trendPct: 1.1,
    dimensions: [88, 90, 82, 86, 100, 94]
  }
];

function weightedBaseScore(dimensions: number[]) {
  const weights = [0.25, 0.2, 0.15, 0.15, 0.15, 0.1];
  return dimensions.reduce((sum, score, idx) => sum + score * weights[idx], 0);
}

function buildShowcaseProfiles(base: AnalyticsProfile[]): AnalyticsProfile[] {
  return SHOWCASE_PROFILE_PRESET.map((preset, index) => {
    const baseId = base[index]?.id ?? `showcase-${index + 1}`;
    const score = Math.round(weightedBaseScore(preset.dimensions));
    return {
      id: baseId,
      name: preset.name,
      role: preset.role,
      totalScore: score,
      trendPct: preset.trendPct,
      dimensions: preset.dimensions,
      weightedBaseScore: Number(weightedBaseScore(preset.dimensions).toFixed(1)),
      riskCoefficient: 1,
      penalty: 0,
      riskGrade: "NORMAL"
    };
  });
}

function normalizeName(rawName: string, index: number) {
  const normalized = (rawName || "").trim();
  if (!normalized || /^\?+$/.test(normalized) || normalized.includes("�")) {
    return FALLBACK_NAMES[index] ?? `成员${index + 1}`;
  }
  return normalized;
}

function points(values: number[], radius: number, center = 140) {
  return values
    .map((value, index) => {
      const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
      const r = (value / 100) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(" ");
}

function axisPoints(count: number, radius: number, center = 140) {
  return Array.from({ length: count }).map((_, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    };
  });
}

function RadarChart({ values, average }: { values: number[]; average: number[] }) {
  const rings = [30, 50, 70, 90];
  const center = 140;
  const chartRadius = 88;
  const labelRadius = 118;
  const axis = axisPoints(values.length, chartRadius, center);
  const labelPoints = axisPoints(values.length, labelRadius, center);

  return (
    <svg viewBox="0 0 280 280" className="h-56 w-56">
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={points(Array(values.length).fill(ring), chartRadius, center)}
          fill="none"
          stroke="#d9dee8"
          strokeDasharray="3 5"
          strokeWidth="1"
        />
      ))}
      {axis.map((line, index) => (
        <line key={index} x1={center} y1={center} x2={line.x} y2={line.y} stroke="#e5e7eb" strokeWidth="1" />
      ))}
      <polygon
        points={points(average, chartRadius, center)}
        fill="none"
        stroke="#9ca3af"
        strokeDasharray="4 4"
        strokeWidth="1.5"
      />
      <polygon points={points(values, chartRadius, center)} fill="rgba(30, 64, 175, 0.15)" stroke="#1d4ed8" strokeWidth="2" />
      {labelPoints.map((item, index) => {
        const baseline = item.y > center + 14 ? "hanging" : item.y < center - 14 ? "auto" : "middle";
        const yOffset = item.y > center + 14 ? 4 : item.y < center - 14 ? -4 : 0;

        return (
          <text
            key={index}
            x={item.x}
            y={item.y + yOffset}
            fill="#475569"
            fontSize="12"
            textAnchor="middle"
            dominantBaseline={baseline}
          >
            {ANALYTICS_METRIC_LABELS[index]}
          </text>
        );
      })}
    </svg>
  );
}

function riskLabel(risk: string) {
  switch (risk) {
    case "REFUSED":
      return "拒绝任务";
    case "REALLOCATED":
      return "任务被接管";
    case "CRITICAL":
      return "严重逾期";
    case "LATE":
      return "轻微逾期";
    default:
      return "正常履约";
  }
}

export function ProjectAnalyticsPage({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const { data, error } = useProjectDashboard(projectId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const syncedUrlMemberKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const raw = searchParams.get("member");
    const key = raw ?? "";
    if (key === syncedUrlMemberKeyRef.current) return;
    syncedUrlMemberKeyRef.current = key;
    if (!raw) return;
    const membersForAnalytics = data.members.map((member, index) => ({
      ...member,
      name: normalizeName(member.name, index),
      projectRole: member.role
    }));
    const profs = buildAnalyticsProfiles(membersForAnalytics, data.tasks, data.logs);
    if (profs.some((p) => p.id === raw)) {
      setActiveId(raw);
    }
  }, [data, searchParams]);

  if (error) {
    return <main className="min-h-screen bg-white p-8 text-critical">{error}</main>;
  }

  if (!data) {
    return <main className="min-h-screen bg-white p-8">Loading...</main>;
  }

  const membersForAnalytics = data.members.map((member, index) => ({
    ...member,
    name: normalizeName(member.name, index),
    projectRole: member.role
  }));

  const computedProfiles = buildAnalyticsProfiles(membersForAnalytics, data.tasks, data.logs).sort(
    (a, b) => b.totalScore - a.totalScore
  );
  const profiles = projectId === "demo" ? buildShowcaseProfiles(computedProfiles) : computedProfiles;

  const teamAverage = ANALYTICS_METRIC_LABELS.map((_, index) =>
    Math.round(profiles.reduce((sum, profile) => sum + profile.dimensions[index], 0) / Math.max(profiles.length, 1))
  );

  const selectedId = activeId ?? profiles[0]?.id ?? null;
  const activeProfile = profiles.find((profile) => profile.id === selectedId);
  const teamOutput = data.tasks.reduce((sum, task) => sum + task.workloadPoints, 0);
  const completed = data.tasks.filter((task) => task.status === "DONE").length;
  const overallTrend = Number(
    (profiles.reduce((sum, profile) => sum + profile.trendPct, 0) / Math.max(profiles.length, 1)).toFixed(1)
  );
  const activeDimensionAverage = activeProfile
    ? Math.round(activeProfile.dimensions.reduce((sum, dim) => sum + dim, 0) / activeProfile.dimensions.length)
    : null;

  return (
    <main className="min-h-screen bg-[#f8f9fa]">
      <TopNav />
      <div className="shell py-6">
        <ProjectHero
          project={data.project}
          title="协作平台成员贡献统计"
          subtitle="采用 6 维雷达评分，最终分按「加权基础分 × 责任系数 - 违规惩罚」计算，拖欠DDL或拒绝任务将显著拉低最终分。"
        />
        <div className="mb-6">
          <Link
            href={`/project/${projectId}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            返回主界面
          </Link>
        </div>

        <section className="mb-6 rounded-2xl bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <div className="grid gap-3 text-sm md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-muted">任务总工作量</div>
              <div className="mt-1 text-2xl font-semibold">{teamOutput} pts</div>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-muted">已完成任务</div>
              <div className="mt-1 text-2xl font-semibold">{completed}</div>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-muted">成员均分</div>
              <div className="mt-1 text-2xl font-semibold">
                {Math.round(profiles.reduce((sum, profile) => sum + profile.totalScore, 0) / Math.max(profiles.length, 1))}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-muted">平均活跃趋势</div>
              <div className={clsx("mt-1 text-2xl font-semibold", overallTrend >= 0 ? "text-blue-700" : "text-red-500")}>
                {overallTrend >= 0 ? "↑" : "↓"} {Math.abs(overallTrend)}%
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">贡献度评分规则</h2>
              <p className="mt-1 text-sm text-slate-600">
                最终分 = 加权基础分 × 责任系数 - 违规惩罚。责任系数：正常 1.00 / 轻微逾期 0.85 / 严重逾期 0.60 /
                被接管 0.35 / 拒绝任务 0.20。
              </p>
            </div>
            <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              数据每 15 秒自动刷新
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {SCORE_RULE_ITEMS.map((rule) => (
              <div key={rule.label} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">{rule.label}</div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                    权重 {rule.weight}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{rule.description}</p>
                <div className="mt-2 text-[11px] text-slate-500">数据源：{rule.source}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-semibold">zero-shot 行为降权</div>
              <p className="mt-1 text-xs leading-5 text-amber-900/90">
                定义：单轮 AI 生成 + 极低人工修改 + 无二次约束，属于“无脑使用 AI 直出”情形。命中后“过程投入”维度上限降至 60，并触发最终分降权。
              </p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              <div className="font-semibold">违规惩罚 P（额外扣分）</div>
              <ul className="mt-1 space-y-1 text-xs leading-5">
                <li>每次逾期未处理：+8</li>
                <li>每次被催告后仍无响应：+12</li>
                <li>每次被接管：+20</li>
                <li>明确拒绝任务：+25</li>
              </ul>
              <p className="mt-2 text-[11px] leading-5 text-rose-900/90">
                自动接管规则：当任务逾期占比达到 50% 且仍未完成时，进入自动再分配候选（默认转入公共池等待接管）。
              </p>
            </div>
          </div>

          {activeProfile && activeDimensionAverage !== null ? (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              当前高亮成员 <span className="font-semibold">{activeProfile.name}</span>：
              <span className="mx-1 font-mono">
                基础分 {activeProfile.weightedBaseScore.toFixed(1)} × 责任系数 {activeProfile.riskCoefficient.toFixed(2)} - 违规惩罚{" "}
                {activeProfile.penalty} = {activeProfile.totalScore}
              </span>
              （风险等级：{riskLabel(activeProfile.riskGrade)}）。
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <article className="rounded-2xl bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">核心贡献排行榜</h2>
            <div className="space-y-2">
              {profiles.map((profile, index) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setActiveId(profile.id)}
                  className={clsx(
                    "w-full rounded-xl px-3 py-3 text-left transition",
                    selectedId === profile.id ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
                  )}
                >
                  <div className="grid grid-cols-[28px_1fr_auto] items-center gap-3">
                    <div className="text-sm font-semibold text-slate-500">{index + 1}</div>
                    <div>
                      <div className="font-medium">{profile.name}</div>
                      <div className="text-xs text-muted">{profile.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{profile.totalScore}</div>
                      <div className={clsx("text-xs", profile.trendPct >= 0 ? "text-blue-700" : "text-red-500")}>
                        {profile.trendPct >= 0 ? "↑" : "↓"} {Math.abs(profile.trendPct)}%
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">全员细分维度雷达看板</h2>
            <p className="mb-5 text-sm text-muted">虚线为团队该维度平均分，实线为个人得分。</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={clsx(
                    "rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 transition",
                    selectedId === profile.id && "ring-2 ring-blue-300"
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{profile.name}</div>
                      <div className="text-xs text-muted">{profile.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold text-slate-900">{profile.totalScore}</div>
                      <div className={clsx("text-xs", profile.trendPct >= 0 ? "text-blue-700" : "text-red-500")}>
                        {profile.trendPct >= 0 ? "↑" : "↓"} {Math.abs(profile.trendPct)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <RadarChart values={profile.dimensions} average={teamAverage} />
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="mb-2 text-xs font-medium text-slate-500">维度分数（用于基础分）</div>
                    <div className="grid grid-cols-2 gap-2">
                      {ANALYTICS_METRIC_LABELS.map((label, dimIdx) => {
                        const score = profile.dimensions[dimIdx];
                        const avg = teamAverage[dimIdx];
                        const diff = score - avg;
                        return (
                          <div key={`${profile.id}-${label}`} className="rounded-lg bg-slate-50 px-2 py-1.5 text-xs">
                            <div className="text-slate-600">
                              {label} · {METRIC_WEIGHTS[dimIdx]}
                            </div>
                            <div className="mt-0.5 flex items-center justify-between">
                              <span className="font-semibold text-slate-900">{score}</span>
                              <span className={clsx(diff >= 0 ? "text-blue-700" : "text-red-500")}>
                                {diff >= 0 ? "+" : ""}
                                {diff}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        {activeProfile ? (
          <section className="mt-6 rounded-2xl bg-white p-4 text-sm text-muted shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            当前高亮成员：<span className="font-medium text-slate-900">{activeProfile.name}</span>，
            最终分 <span className="font-medium text-slate-900">{activeProfile.totalScore}</span>。
            如触发「严重逾期 / 被接管 / 拒绝任务」，责任系数与惩罚项会显著降低最终分。
          </section>
        ) : null}
      </div>

      <ProjectAiChatPanel
        projectId={projectId}
        disabled={data.isGuest || !data.me}
        currentUserName={data.me?.name}
      />
    </main>
  );
}
