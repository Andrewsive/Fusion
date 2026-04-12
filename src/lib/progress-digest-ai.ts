import { createOpenAIClient } from "@/lib/openai-client";
import { prisma } from "@/lib/prisma";

const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export async function generateAndStoreProgressDigest(projectId: string, scope: "day" | "week"): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const since = new Date();
  if (scope === "day") {
    since.setDate(since.getDate() - 1);
  } else {
    since.setDate(since.getDate() - 7);
  }

  const [project, tasks, logs] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.task.findMany({
      where: { projectId },
      include: { assignee: { select: { name: true } } },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.actionLog.findMany({
      where: { projectId, createdAt: { gte: since } },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 40
    })
  ]);

  if (!project) {
    throw new Error("Project not found");
  }

  const taskLines = tasks
    .filter((t) => t.status !== "REALLOCATED")
    .map(
      (t) =>
        `- ${t.title}｜${t.status}｜${t.assignee?.name ?? "未分配"}｜${t.workloadPoints}点`
    )
    .join("\n");

  const logLines = logs
    .map((l) => `- ${l.createdAt.toISOString().slice(0, 16)} ${l.user.name}: ${l.description}`)
    .join("\n");

  const client = createOpenAIClient();
  const scopeLabel = scope === "day" ? "过去约 24 小时" : "过去约 7 天";

  const res = await client.chat.completions.create({
    model,
    temperature: 0.35,
    messages: [
      {
        role: "system",
        content:
          "You write very short team progress briefs in zh-CN for all project members. " +
          "Output 2–4 short bullet lines (use leading •), total under 220 Chinese characters. " +
          "Be factual from the data; no fluff; mention blockers if any; no markdown headings."
      },
      {
        role: "user",
        content: `项目：${project.title}\n时间范围：${scopeLabel}\n\n当前任务快照：\n${taskLines || "（无）"}\n\n近期操作记录：\n${logLines || "（无）"}\n\n请生成团队进度简报。`
      }
    ]
  });

  const text = res.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("AI digest is empty");
  }

  const now = new Date();
  await prisma.project.update({
    where: { id: projectId },
    data: {
      progressDigest: text.slice(0, 2000),
      progressDigestAt: now
    }
  });

  return text;
}
