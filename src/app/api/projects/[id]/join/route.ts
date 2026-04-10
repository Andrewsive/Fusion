import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { USER_COOKIE } from "@/lib/auth";

const joinSchema = z.object({
  name: z.string().min(1)
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = joinSchema.parse(await request.json());
    const { id } = await params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const user = await prisma.user.create({ data: { name: body.name } });

    await prisma.projectMember.create({
      data: {
        projectId: id,
        userId: user.id,
        role: "MEMBER"
      }
    });

    await prisma.actionLog.create({
      data: {
        projectId: id,
        userId: user.id,
        actionType: "MEMBER_JOINED",
        description: `${user.name} joined via invite`
      }
    });

    const cookieStore = await cookies();
    cookieStore.set(USER_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/"
    });

    return NextResponse.json({ projectId: id, userId: user.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Join failed" },
      { status: 400 }
    );
  }
}
