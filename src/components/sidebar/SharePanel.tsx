"use client";

import { useState } from "react";
import { Collaborator, Role } from "@/types";

interface Props {
  documentId: string;
  collaborators: Collaborator[];
  currentUserId: string;
  currentUserRole: Role;
  onUpdate: () => void;
}

export default function SharePanel({ documentId, collaborators, currentUserId, currentUserRole, onUpdate }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isOwner = currentUserRole === "OWNER";

  async function invite() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to invite"); return; }
      setSuccess(`${email} invited as ${role}`);
      setEmail("");
      onUpdate();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(userId: string, newRole: Role) {
    await fetch(`/api/documents/${documentId}/share`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: newRole }),
    });
    onUpdate();
  }

  async function removeCollaborator(userId: string) {
    await fetch(`/api/documents/${documentId}/share`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    onUpdate();
  }

  const roleColors: Record<Role, string> = {
    OWNER: "bg-purple-100 text-purple-700",
    EDITOR: "bg-blue-100 text-blue-700",
    VIEWER: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-800 text-sm mb-4">👥 Collaborators</h2>

        {isOwner && (
          <div className="space-y-2 mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Invite by email…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              onKeyDown={(e) => e.key === "Enter" && invite()}
            />
            <div className="flex gap-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "EDITOR" | "VIEWER")}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                onClick={invite}
                disabled={loading || !email.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? "…" : "Invite"}
              </button>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            {success && <p className="text-green-600 text-xs">{success}</p>}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {collaborators.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-sm font-semibold text-purple-700 shrink-0">
              {c.user.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{c.user.name || "Unknown"}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[c.role]}`}>
                {c.role}
              </span>
            </div>
            {isOwner && c.userId !== currentUserId && (
              <div className="flex gap-1">
                <select
                  value={c.role}
                  onChange={(e) => updateRole(c.userId, e.target.value as Role)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1"
                >
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <button
                  onClick={() => removeCollaborator(c.userId)}
                  className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
                  title="Remove"
                >✕</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
