import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

const MAX_PAYLOAD = 1_000_000; // 1MB hard limit — OOM prevention

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // OOM Prevention: reject oversized payloads immediately
  const contentLength = parseInt(req.headers.get("content-length") || "0");
  if (contentLength > MAX_PAYLOAD) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  // Verify user has EDITOR or OWNER role (not VIEWER)
  const collaborator = await prisma.documentCollaborator.findUnique({
    where: {
      documentId_userId: { documentId: params.id, userId: session.user.id },
    },
  });

  if (!collaborator || collaborator.role === "VIEWER") {
    return NextResponse.json({ error: "Write access denied" }, { status: 403 });
  }

  // Check document exists (RLS: user must have access)
  const document = await prisma.document.findFirst({
    where: {
      id: params.id,
      OR: [
        { ownerId: session.user.id },
        { collaborators: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Read body as binary
  const buffer = await req.arrayBuffer();
  const yjsState = Buffer.from(buffer);

  if (yjsState.byteLength > MAX_PAYLOAD) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  // Validate it's plausible Yjs data (basic sanity check)
  if (yjsState.byteLength === 0) {
    return NextResponse.json({ error: "Empty update" }, { status: 400 });
  }

  // Store in DB
  await prisma.document.update({
    where: { id: params.id },
    data: { yjsState, updatedAt: new Date() },
  });

  // Log operation for audit trail
  await prisma.operation.create({
    data: {
      documentId: params.id,
      userId: session.user.id,
      type: "sync",
      payload: { size: yjsState.byteLength },
      timestamp: BigInt(Date.now()),
      applied: true,
    },
  });

  return NextResponse.json({ ok: true, size: yjsState.byteLength });
}
