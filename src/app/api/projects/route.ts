import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { USER_COOKIE, getCurrentUserId } from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/session-cookie";

const createProjectSchema = z.object({
  title: z.string().min(2),
  deadline: z.string().datetime(),
  ownerName: z.string().min(1),
  memberNames: z.array(z.string().min(1)).default([])
});

function inviteCode(): string {
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `FUSION-${rand}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = createProjectSchema.parse(await request.json());
    const sessionUserId = await getCurrentUserId();

    const result = await prisma.$transaction(async (tx) => {
      let owner;
      if (sessionUserId) {
        const existing = await tx.user.findUnique({ where: { id: sessionUserId } });
        if (!existing) {
          throw new Error("登录已失效，请重新登录");
        }
        owner = await tx.user.update({
          where: { id: sessionUserId },
          data: { name: body.ownerName.trim() }
        });
      } else {
        owner = await tx.user.create({
          data: { name: body.ownerName.trim() }
        });
      }

      const project = await tx.project.create({
        data: {
          title: body.title,
          deadline: new Date(body.deadline),
          inviteCode: inviteCode()
        }
      });

      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId: owner.id,
          role: "OWNER"
        }
      });

      for (const name of body.memberNames) {
        const user = await tx.user.create({ data: { name } });
        await tx.projectMember.create({
          data: {
            projectId: project.id,
            userId: user.id,
            role: "MEMBER"
          }
        });
      }

      await tx.actionLog.create({
        data: {
          projectId: project.id,
          userId: owner.id,
          actionType: "PROJECT_CREATED",
          description: `${owner.name} created the project`
        }
      });

      return { owner, project };
    });

    const cookieStore = await cookies();
    cookieStore.set(USER_COOKIE, result.owner.id, sessionCookieOptions());

    return NextResponse.json({
      projectId: result.project.id,
      inviteCode: result.project.inviteCode,
      ownerId: result.owner.id
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create project" },
      { status: 400 }
    );
  }
}
