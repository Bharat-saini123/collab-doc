import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["EDITOR", "VIEWER"]),
});

// Invite collaborator
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only owner can invite
  const doc = await prisma.document.findFirst({
    where: { id: params.id, ownerId: session.user.id },
  });
  if (!doc) return NextResponse.json({ error: "Only the owner can invite collaborators" }, { status: 403 });

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const invitee = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!invitee) return NextResponse.json({ error: "User not found. They must sign up first." }, { status: 404 });

  if (invitee.id === session.user.id) return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });

  const collab = await prisma.documentCollaborator.upsert({
    where: { documentId_userId: { documentId: params.id, userId: invitee.id } },
    update: { role: parsed.data.role },
    create: { documentId: params.id, userId: invitee.id, role: parsed.data.role },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(collab, { status: 201 });
}

// Update role
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.document.findFirst({ where: { id: params.id, ownerId: session.user.id } });
  if (!doc) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, role } = await req.json();
  if (!userId || !["EDITOR", "VIEWER"].includes(role)) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  await prisma.documentCollaborator.update({
    where: { documentId_userId: { documentId: params.id, userId } },
    data: { role },
  });

  return NextResponse.json({ ok: true });
}

// Remove collaborator
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.document.findFirst({ where: { id: params.id, ownerId: session.user.id } });
  if (!doc) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  await prisma.documentCollaborator.delete({
    where: { documentId_userId: { documentId: params.id, userId } },
  });

  return NextResponse.json({ ok: true });
}
