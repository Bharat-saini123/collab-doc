import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await prisma.documentCollaborator.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId: id },
  });
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: version.id,
    title: version.title,
    snapshot: version.yjsSnapshot.toString("base64"),
    createdAt: version.createdAt,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collaborator = await prisma.documentCollaborator.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!collaborator || collaborator.role === "VIEWER") {
    return NextResponse.json({ error: "Write access denied" }, { status: 403 });
  }

  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId: id },
  });
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentDoc = await prisma.document.findUnique({ where: { id } });
  if (currentDoc?.yjsState) {
    await prisma.documentVersion.create({
      data: {
        documentId: id,
        createdById: session.user.id,
        title: `Auto-save before restore (${new Date().toLocaleString()})`,
        yjsSnapshot: currentDoc.yjsState,
        summary: "Automatically saved before restoring a previous version",
      },
    });
  }

  await prisma.document.update({
    where: { id },
    data: { yjsState: version.yjsSnapshot },
  });

  return NextResponse.json({ ok: true, snapshot: version.yjsSnapshot.toString("base64") });
}
