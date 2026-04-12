import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWarningLevel } from "@/lib/warning";
import { requireProjectMember } from "@/lib/auth";
import { ensureDefaultProjectDocuments } from "@/lib/project-documents";
import { toPublicUser } from "@/lib/user-serialize";
import { parseAssignmentMilestones, sortMilestonesByDue } from "@/lib/assignment-milestones";
import { runDeadlineUltimatumEngine } from "@/lib/deadline-ultimatum";

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

    if (members.length === 0) {
      return NextResponse.json({ error: "Project has no members" }, { status: 403 });
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

    if (meId) {
      await runDeadlineUltimatumEngine(id).catch((err) => console.error("deadline ultimatum", err));
    }

    const tasksLatest = await prisma.task.findMany({
      where: { projectId: id },
      include: { assignee: true },
      orderBy: { createdAt: "asc" }
    });

    if (meId) {
      await ensureDefaultProjectDocuments(id);
    }

    const documentRows = meId
      ? await prisma.projectDocument.findMany({
          where: { projectId: id },
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" }
        })
      : [];

    const myMembership = members.find((m) => m.userId === meId);
    const me = myMembership?.user ?? null;
    const isOwner = myMembership?.role === "OWNER";
    const isGuest = meId === null;

    const { keyDeliverables: rawDeliverables, assignmentMilestones: rawMilestones, ...projectRest } = project;

    const milestonesSorted = (() => {
      const list = parseAssignmentMilestones(rawMilestones);
      return list ? sortMilestonesByDue(list) : null;
    })();

    const publicMembers = members.map((m) => toPublicUser(m.user));
    const publicMe = me ? toPublicUser(me, { includeEmail: true }) : null;
    const publicLogs = logs.map((log) => ({
      ...log,
      user: toPublicUser(log.user)
    }));
    const publicTasks = tasksLatest.map((task: any) => ({
      ...task,
      warningLevel: getWarningLevel(task.deadline),
      assignee: task.assignee ? toPublicUser(task.assignee) : null
    }));

    return NextResponse.json({
      isGuest,
      isOwner,
      project: {
        ...projectRest,
        keyDeliverables: parseKeyDeliverables(rawDeliverables),
        assignmentMilestones: milestonesSorted
      },
      me: publicMe,
      members: publicMembers,
      tasks: publicTasks,
      logs: publicLogs,
      documents: documentRows.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        author: doc.author
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard" },
      { status: 400 }
    );
  }
}
