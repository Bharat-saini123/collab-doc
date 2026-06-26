"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { Document } from "@/types";

interface Props {
  documents: Document[];
  user: { id: string; name?: string | null; email?: string | null; image?: string | null };
}

export default function DashboardClient({ documents: initialDocs, user }: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocs);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  async function createDocument() {
    setCreating(true);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled Document" }),
    });
    if (res.ok) {
      const doc = await res.json();
      router.push(`/doc/${doc.id}`);
    }
    setCreating(false);
  }

  async function deleteDocument(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    const res = await fetch(`/api/documents/${id}/state`, { method: "DELETE" });
    if (res.ok) setDocuments((d) => d.filter((x) => x.id !== id));
  }

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const myDocs = filtered.filter((d) => d.ownerId === user.id);
  const sharedDocs = filtered.filter((d) => d.ownerId !== user.id);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-bold text-slate-800 text-lg">CollabDoc</span>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <div className="flex items-center gap-3">
            {user.image ? (
              <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-semibold text-sm">
                {user.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <span className="text-sm text-slate-600 hidden sm:block">{user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Workspace</h1>
            <p className="text-slate-500 mt-1">{documents.length} documents</p>
          </div>
          <button
            onClick={createDocument}
            disabled={creating}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            <span className="text-xl leading-none">+</span>
            {creating ? "Creating…" : "New Document"}
          </button>
        </div>

        {/* My documents */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            My Documents ({myDocs.length})
          </h2>
          {myDocs.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
              <div className="text-5xl mb-4">📄</div>
              <p className="text-slate-500 mb-4">No documents yet</p>
              <button
                onClick={createDocument}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
              >
                Create your first document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {myDocs.map((doc) => (
                <DocCard key={doc.id} doc={doc} userId={user.id} onDelete={deleteDocument} />
              ))}
            </div>
          )}
        </section>

        {/* Shared with me */}
        {sharedDocs.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Shared with Me ({sharedDocs.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sharedDocs.map((doc) => (
                <DocCard key={doc.id} doc={doc} userId={user.id} onDelete={() => {}} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-slate-400 text-sm mt-10">
        Built by{" "}
        <a href="https://github.com/yourusername" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">Your Name</a>
        {" · "}
        <a href="https://github.com/yourusername/collab-doc" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">GitHub</a>
        {" · "}
        <a href="https://linkedin.com/in/yourusername" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">LinkedIn</a>
      </footer>
    </div>
  );
}

function DocCard({ doc, userId, onDelete }: { doc: Document; userId: string; onDelete: (id: string) => void }) {
  const router = useRouter();
  const role = doc.collaborators.find((c) => c.userId === userId)?.role || "VIEWER";
  const roleColors: Record<string, string> = {
    OWNER: "bg-purple-100 text-purple-700",
    EDITOR: "bg-blue-100 text-blue-700",
    VIEWER: "bg-slate-100 text-slate-600",
  };

  return (
    <div
      onClick={() => router.push(`/doc/${doc.id}`)}
      className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-purple-200 cursor-pointer transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-2xl">
          📄
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${roleColors[role]}`}>
            {role}
          </span>
          {doc.ownerId === userId && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1"
              title="Delete"
            >
              🗑
            </button>
          )}
        </div>
      </div>
      <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2 text-sm">{doc.title}</h3>
      <p className="text-xs text-slate-400 mt-auto">
        {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
      </p>
      {doc._count && doc._count.versions > 0 && (
        <p className="text-xs text-slate-400 mt-1">🕐 {doc._count.versions} versions</p>
      )}
      <div className="flex items-center gap-1 mt-3">
        {doc.collaborators.slice(0, 4).map((c) => (
          <div key={c.id} title={c.user.name || ""} className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center text-xs font-semibold text-purple-700 border-2 border-white -ml-1 first:ml-0">
            {c.user.name?.[0]?.toUpperCase() || "?"}
          </div>
        ))}
        {doc.collaborators.length > 4 && (
          <span className="text-xs text-slate-400 ml-1">+{doc.collaborators.length - 4}</span>
        )}
      </div>
    </div>
  );
}
