import type { PrismaClient } from "@prisma/client";

/** 开发环境下热更新后 global 里可能仍是旧 Prisma 实例，缺少新模型的 delegate */
export function prismaHasNotificationModels(client: PrismaClient): boolean {
  const p = client as unknown as { userNotification?: { findMany?: unknown } };
  return typeof p.userNotification?.findMany === "function";
}
