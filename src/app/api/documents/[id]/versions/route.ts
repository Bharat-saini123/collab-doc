import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const createVersionSchema = z.object({
  title: z.string().min(1).max(200),
  yjsSnapshot: z.string(), // base64 encoded
  contentJson: z.record(z.unknown()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await prisma.documentCollaborator.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id },
    include: { createdBy: { select: { name: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Don't send full yjsSnapshot in list — too heavy
  return NextResponse.json(
    versions.map((v) => ({
      id: v.id,
      title: v.title,
      summary: v.summary,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
    }))
  );
}

export async function POST(
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

  const body = await req.json().catch(() => null);
  const parsed = createVersionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  // Decode base64 snapshot
  const yjsSnapshot = Buffer.from(parsed.data.yjsSnapshot, "base64");

  // Size check
  if (yjsSnapshot.byteLength > 5_000_000) {
    return NextResponse.json({ error: "Snapshot too large" }, { status: 413 });
  }

  const version = await prisma.documentVersion.create({
    data: {
      documentId: id,
      createdById: session.user.id,
      title: parsed.data.title,
      yjsSnapshot,
      contentJson: parsed.data.contentJson as Prisma.InputJsonValue | undefined,
    },
    include: { createdBy: { select: { name: true, image: true } } },
  });

  return NextResponse.json({
    id: version.id,
    title: version.title,
    createdAt: version.createdAt,
    createdBy: version.createdBy,
  }, { status: 201 });
}
