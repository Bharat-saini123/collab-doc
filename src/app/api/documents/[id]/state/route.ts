import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const document = await prisma.document.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session.user.id },
        { collaborators: { some: { userId: session.user.id } } },
        { isPublic: true },
      ],
    },
    select: { yjsState: true },
  });

  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!document.yjsState) {
    return new NextResponse(new Uint8Array(0), {
      headers: { "Content-Type": "application/octet-stream" },
    });
  }

  return new NextResponse(new Uint8Array(document.yjsState), {
    headers: { "Content-Type": "application/octet-stream" },
  });
}

// Update document title
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collaborator = await prisma.documentCollaborator.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!collaborator || collaborator.role === "VIEWER") {
    return NextResponse.json({ error: "Write access denied" }, { status: 403 });
  }

  const body = await req.json();
  if (typeof body.title !== "string" || body.title.length > 500) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }

  const doc = await prisma.document.update({
    where: { id },
    data: { title: body.title.trim() },
  });

  return NextResponse.json({ title: doc.title });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only owner can delete
  const doc = await prisma.document.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!doc) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
