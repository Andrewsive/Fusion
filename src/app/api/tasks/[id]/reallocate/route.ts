import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectMember } from "@/lib/auth";

const payloadSchema = z.object({
  newAssigneeId: z.string().optional()
});

function creditPenalty(workloadPoints: number): number {
  return Math.max(1, Math.min(20, Math.ceil(workloadPoints / 5)));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = payloadSchema.parse(await request.json());

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const actorId = await requireProjectMember(task.projectId);

    if (task.status === "DONE" || task.status === "REALLOCATED") {
      return NextResponse.json({ error: "Task already terminal" }, { status: 400 });
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId: task.projectId },
      include: { user: true }
    });

    let nextAssigneeId = payload.newAssigneeId;

    if (!nextAssigneeId) {
      const candidate = members
        .map((member) => member.user)
        .filter((user) => user.id !== task.assigneeId)
        .sort((a, b) => a.accumulatedPoints - b.accumulatedPoints)[0];
      nextAssigneeId = candidate?.id;
    }

    if (!nextAssigneeId) {
      return NextResponse.json({ error: "No target assignee available" }, { status: 400 });
    }

    const penalty = creditPenalty(task.workloadPoints);

    const result = await prisma.$transaction(async (tx) => {
      const oldTask = await tx.task.update({
        where: { id: task.id },
        data: {
          status: "REALLOCATED",
          isReallocated: true
        }
      });

      if (task.assigneeId) {
        await tx.user.update({
          where: { id: task.assigneeId },
          data: {
            creditScore: {
              decrement: penalty
            }
          }
        });
      }

      const newTask = await tx.task.create({
        data: {
          projectId: task.projectId,
          assigneeId: nextAssigneeId,
          title: `[Reallocated] ${task.title}`,
          workloadPoints: task.workloadPoints,
          status: "TODO",
          deadline: task.deadline,
          isReallocated: true
        },
        include: { assignee: true }
      });

      await tx.actionLog.create({
        data: {
          projectId: task.projectId,
          userId: actorId,
          actionType: "TASK_REALLOCATED",
          description: `${oldTask.title} was reallocated (credit -${penalty})`
        }
      });

      return newTask;
    });

    return NextResponse.json({ task: result, penalty });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reallocation failed" },
      { status: 400 }
    );
  }
}
