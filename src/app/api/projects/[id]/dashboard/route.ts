import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWarningLevel } from "@/lib/warning";
import { requireProjectMember } from "@/lib/auth";

function parseKeyDeliverables(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return null;
    const list = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    return list.length ? list : null;
  } catch {
    return null;
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const meId = await requireProjectMember(id);

    const [project, members, tasks, logs] = await Promise.all([
      prisma.project.findUnique({ where: { id } }),
      prisma.projectMember.findMany({ where: { projectId: id }, include: { user: true } }),
      prisma.task.findMany({ where: { projectId: id }, include: { assignee: true }, orderBy: { createdAt: "asc" } }),
      prisma.actionLog.findMany({
        where: { projectId: id },
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 30
      })
    ]);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const tasksWithWarning = tasks.map((task: any) => ({
      ...task,
      warningLevel: getWarningLevel(task.deadline)
    }));

    await prisma.$transaction(
      tasksWithWarning.map((task: any) =>
        prisma.task.update({
          where: { id: task.id },
          data: { warningLevel: task.warningLevel }
        })
      )
    );

    const myMembership = members.find((m) => m.userId === meId);
    const me = myMembership?.user;

    if (!me) {
      return NextResponse.json({ error: "User is not in project" }, { status: 403 });
    }

    const isOwner = myMembership.role === "OWNER";

    const { keyDeliverables: rawDeliverables, ...projectRest } = project;

    return NextResponse.json({
      isOwner,
      project: {
        ...projectRest,
        keyDeliverables: parseKeyDeliverables(rawDeliverables)
      },
      me,
      members: members.map((member) => member.user),
      tasks: tasksWithWarning,
      logs
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard" },
      { status: 400 }
    );
  }
}
