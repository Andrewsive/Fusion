import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const USER_COOKIE = "fusion_user_id";

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(USER_COOKIE)?.value ?? null;
}

export async function requireProjectMember(projectId: string): Promise<string> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Missing user session. Join project first.");
  }

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId
      }
    }
  });

  if (!member) {
    throw new Error("Not a project member.");
  }

  return userId;
}

export async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId
      }
    }
  });

  return member?.role === "OWNER";
}
