import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      creditScore INTEGER NOT NULL DEFAULT 100,
      accumulatedPoints INTEGER NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Project (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      inviteCode TEXT NOT NULL UNIQUE,
      contextSummary TEXT NOT NULL DEFAULT 'No context yet',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      deadline DATETIME NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ProjectMember (
      id TEXT PRIMARY KEY NOT NULL,
      projectId TEXT NOT NULL,
      userId TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'MEMBER',
      joinedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(projectId) REFERENCES Project(id) ON DELETE CASCADE,
      FOREIGN KEY(userId) REFERENCES User(id) ON DELETE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS ProjectMember_projectId_userId_key ON ProjectMember(projectId, userId);`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Task (
      id TEXT PRIMARY KEY NOT NULL,
      projectId TEXT NOT NULL,
      assigneeId TEXT,
      title TEXT NOT NULL,
      workloadPoints INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'UNASSIGNED',
      deadline DATETIME NOT NULL,
      warningLevel TEXT NOT NULL DEFAULT 'NORMAL',
      isReallocated BOOLEAN NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      FOREIGN KEY(projectId) REFERENCES Project(id) ON DELETE CASCADE,
      FOREIGN KEY(assigneeId) REFERENCES User(id)
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ActionLog (
      id TEXT PRIMARY KEY NOT NULL,
      projectId TEXT NOT NULL,
      userId TEXT NOT NULL,
      actionType TEXT NOT NULL,
      description TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(projectId) REFERENCES Project(id) ON DELETE CASCADE,
      FOREIGN KEY(userId) REFERENCES User(id) ON DELETE CASCADE
    );
  `);

  console.log("Database initialized.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
