import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectMember } from "@/lib/auth";

const patchSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().max(500_000).optional()
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, {
    message: "Provide title and/or content"
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: projectId, docId } = await params;
    await requireProjectMember(projectId);
    const body = patchSchema.parse(await request.json());

    const existing = await prisma.projectDocument.findFirst({
      where: { id: docId, projectId }
    });
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const doc = await prisma.projectDocument.update({
      where: { id: docId },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.content !== undefined ? { content: body.content } : {})
      },
      include: { author: { select: { id: true, name: true } } }
    });

    return NextResponse.json({
      document: {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        author: doc.author
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update document failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const { id: projectId, docId } = await params;
    await requireProjectMember(projectId);

    const existing = await prisma.projectDocument.findFirst({
      where: { id: docId, projectId }
    });
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await prisma.projectDocument.delete({ where: { id: docId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete document failed" },
      { status: 400 }
    );
  }
}
