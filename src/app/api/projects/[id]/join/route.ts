import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { USER_COOKIE, getCurrentUserId } from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/session-cookie";
import { createMemberJoin, linkExistingUserToProject } from "@/lib/project-join";

const joinSchema = z.object({
  name: z.string().optional()
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = joinSchema.parse(await request.json());
    const { id } = await params;

    const cookieStore = await cookies();
    const currentId = await getCurrentUserId();

    if (currentId) {
      const result = await linkExistingUserToProject(currentId, id);
      cookieStore.set(USER_COOKIE, result.userId, sessionCookieOptions());
      return NextResponse.json({
        projectId: result.projectId,
        userId: result.userId,
        alreadyMember: result.alreadyMember
      });
    }

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "请先登录，或填写昵称后加入" }, { status: 400 });
    }

    const result = await createMemberJoin(id, name);
    cookieStore.set(USER_COOKIE, result.userId, sessionCookieOptions());

    return NextResponse.json({ projectId: result.projectId, userId: result.userId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "格式错误" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Join failed";
    const status = message === "Project not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
