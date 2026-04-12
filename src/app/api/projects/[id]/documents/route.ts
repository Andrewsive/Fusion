import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectMember } from "@/lib/auth";

const createSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(500_000).optional()
});

function serializeDoc(doc: {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string };
}) {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    author: doc.author
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const userId = await requireProjectMember(projectId);
    const body = createSchema.parse(await request.json());

    const count = await prisma.projectDocument.count({ where: { projectId } });
    const title = body.title?.trim() || `新文档 ${count + 1}`;

    const doc = await prisma.projectDocument.create({
      data: {
        projectId,
        authorId: userId,
        title,
        content: body.content ?? ""
      },
      include: { author: { select: { id: true, name: true } } }
    });

    return NextResponse.json({ document: serializeDoc(doc) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create document failed" },
      { status: 400 }
    );
  }
}
