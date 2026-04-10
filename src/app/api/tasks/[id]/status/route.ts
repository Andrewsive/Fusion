import { TaskStatus } from "@/lib/domain";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/lib/state-machine";
import { requireProjectMember } from "@/lib/auth";

const statusSchema = z.object({
  status: z.enum(["UNASSIGNED", "TODO", "IN_PROGRESS", "BLOCKED", "DONE", "REALLOCATED"]),
  assigneeId: z.string().optional()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = statusSchema.parse(await request.json());

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const userId = await requireProjectMember(task.projectId);

    if (task.status === "DONE" || task.status === "REALLOCATED") {
      return NextResponse.json({ error: "Terminal tasks are locked" }, { status: 400 });
    }

    assertTransition(task.status as TaskStatus, body.status as TaskStatus);

    if (body.status === "DONE") {
      const assigneeId = task.assigneeId ?? userId;

      const result = await prisma.$transaction(async (tx) => {
        const updatedTask = await tx.task.update({
          where: { id },
          data: {
            status: "DONE",
            assigneeId
          }
        });

        await tx.user.update({
          where: { id: assigneeId },
          data: { accumulatedPoints: { increment: task.workloadPoints } }
        });

        await tx.actionLog.create({
          data: {
            projectId: task.projectId,
            userId,
            actionType: "TASK_DONE",
            description: `${updatedTask.title} marked DONE (+${task.workloadPoints} points)`
          }
        });

        return updatedTask;
      });

      return NextResponse.json({ task: result });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        status: body.status,
        assigneeId: body.assigneeId ?? task.assigneeId ?? (body.status === "TODO" ? userId : null)
      }
    });

    await prisma.actionLog.create({
      data: {
        projectId: task.projectId,
        userId,
        actionType: "TASK_STATUS_CHANGED",
        description: `${updated.title} moved to ${body.status}`
      }
    });

    return NextResponse.json({ task: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update status" },
      { status: 400 }
    );
  }
}
