import { prisma } from "@/lib/prisma";

type MemberUser = { id: string; name: string };
type TaskRow = { title: string; workloadPoints: number; assignee: { name: string } | null };

export function buildDefaultDocumentRows(
  project: { title: string; contextSummary: string },
  members: MemberUser[],
  tasks: TaskRow[]
) {
  const owner = members[0];
  if (!owner) return [];

  const m1 = members[1] ?? owner;
  const m2 = members[2] ?? owner;
  const taskBlock =
    tasks.length > 0
      ? tasks
          .map(
            (task, index) =>
              `${index + 1}. ${task.title}｜负责人：${task.assignee?.name ?? "待分配"}｜工作量：${task.workloadPoints}`
          )
          .join("\n")
      : "当前还没有已生成任务，可以先在项目管理页或 AI 面板中补充内容。";

  return [
    {
      authorId: owner.id,
      title: "项目概述",
      content: `${project.title}\n\n项目概述：\n${project.contextSummary || "暂无共享摘要。"}`
    },
    {
      authorId: m1.id,
      title: "任务拆解",
      content: taskBlock
    },
    {
      authorId: m2.id,
      title: "成员协作记录",
      content: members.map((member, index) => `${index + 1}. ${member.name}：待补充本周进展`).join("\n")
    }
  ];
}

/** Creates the three starter docs when a project has none (idempotent). */
export async function ensureDefaultProjectDocuments(projectId: string) {
  const count = await prisma.projectDocument.count({ where: { projectId } });
  if (count > 0) return;

  const [project, memberRows, tasks] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { joinedAt: "asc" }
    }),
    prisma.task.findMany({
      where: { projectId },
      include: { assignee: true },
      orderBy: { createdAt: "asc" }
    })
  ]);

  if (!project || memberRows.length === 0) return;

  const members = memberRows.map((m) => m.user);
  const rows = buildDefaultDocumentRows(project, members, tasks);
  if (!rows.length) return;

  await prisma.projectDocument.createMany({
    data: rows.map((row) => ({
      projectId,
      authorId: row.authorId,
      title: row.title,
      content: row.content
    }))
  });
}
