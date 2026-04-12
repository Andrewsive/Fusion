import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { USER_COOKIE, getCurrentUserId } from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/session-cookie";
import {
  createMemberJoin,
  linkExistingUserToProject,
  resolveProjectByInviteCode
} from "@/lib/project-join";

const joinBodySchema = z
  .object({
    name: z.string().optional(),
    projectId: z.string().min(1).optional(),
    inviteCode: z.string().min(1).optional()
  })
  .refine((b) => {
    const hasId = Boolean(b.projectId?.trim());
    const hasCode = Boolean(b.inviteCode?.trim());
    return hasId !== hasCode;
  }, {
    message: "请只填「项目 ID」或「邀请码」其中一项"
  });

export async function POST(request: NextRequest) {
  try {
    const body = joinBodySchema.parse(await request.json());

    let projectId: string;
    if (body.projectId?.trim()) {
      projectId = body.projectId.trim();
    } else {
      const project = await resolveProjectByInviteCode(body.inviteCode!);
      if (!project) {
        return NextResponse.json({ error: "邀请码无效或项目不存在" }, { status: 404 });
      }
      projectId = project.id;
    }

    const cookieStore = await cookies();
    const currentId = await getCurrentUserId();

    if (currentId) {
      const result = await linkExistingUserToProject(currentId, projectId);
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

    const result = await createMemberJoin(projectId, name);
    cookieStore.set(USER_COOKIE, result.userId, sessionCookieOptions());

    return NextResponse.json({ projectId: result.projectId, userId: result.userId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "请求格式错误";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Join failed";
    const status = message === "Project not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
