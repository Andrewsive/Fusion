import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWarningLevel } from "@/lib/warning";
import { requireProjectMember } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let meId: string | null = null;
    try {
      meId = await requireProjectMember(id);
    } catch {
      // Allow read-only dashboard mode for direct shared links without an active member cookie.
      meId = null;
    }

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

    const me = members.find((m) => m.userId === meId)?.user ?? members[0]?.user;

    if (!me) {
      return NextResponse.json({ error: "User is not in project" }, { status: 403 });
    }

    return NextResponse.json({
      project,
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
