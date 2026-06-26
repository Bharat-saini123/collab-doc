import { auth } from "@/lib/auth/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import DocPageClient from "./client";

export default async function DocPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const document = await prisma.document.findFirst({
    where: {
      id: params.id,
      OR: [
        { ownerId: session.user.id },
        { collaborators: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      collaborators: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  if (!document) notFound();

  const userCollab = document.collaborators.find((c) => c.userId === session.user.id);
  const role = userCollab?.role || (document.ownerId === session.user.id ? "OWNER" : "VIEWER");

  return (
    <DocPageClient
      document={JSON.parse(JSON.stringify(document))}
      user={{ id: session.user.id, name: session.user.name, image: session.user.image }}
      role={role as "OWNER" | "EDITOR" | "VIEWER"}
    />
  );
}
