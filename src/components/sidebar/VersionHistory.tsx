"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { DocumentVersion } from "@/types";
import * as Y from "yjs";

interface Props {
  documentId: string;
  ydoc: Y.Doc | null;
  onRestore: (snapshot: Uint8Array) => void;
  canEdit: boolean;
}

export default function VersionHistory({ documentId, ydoc, onRestore, canEdit }: Props) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [versionTitle, setVersionTitle] = useState("");
  const [restoring, setRestoring] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`);
      if (res.ok) setVersions(await res.json());
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => { loadVersions(); }, [loadVersions]);

  async function saveVersion() {
    if (!ydoc || !versionTitle.trim()) return;
    setSaving(true);
    try {
      const snapshot = Y.encodeStateAsUpdate(ydoc);
      const base64 = Buffer.from(snapshot).toString("base64");
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: versionTitle.trim(), yjsSnapshot: base64 }),
      });
      if (res.ok) {
        setVersionTitle("");
        loadVersions();
      }
    } finally {
      setSaving(false);
    }
  }

  async function restoreVersion(versionId: string) {
    if (!confirm("Restore this version? Current state will be auto-saved first.")) return;
    setRestoring(versionId);
    try {
      const res = await fetch(`/api/documents/${documentId}/versions/${versionId}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        const snapshot = new Uint8Array(Buffer.from(data.snapshot, "base64"));
        onRestore(snapshot);
        loadVersions();
      }
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-800 text-sm mb-3">Version History</h2>
        {canEdit && (
          <div className="space-y-2">
            <input
              type="text"
              value={versionTitle}
              onChange={(e) => setVersionTitle(e.target.value)}
              placeholder="Version name…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              onKeyDown={(e) => e.key === "Enter" && saveVersion()}
            />
            <button
              onClick={saveVersion}
              disabled={saving || !versionTitle.trim()}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? "Saving…" : "💾 Save Version"}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-slate-400 text-sm py-8">Loading…</div>
        ) : versions.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-8">
            <div className="text-3xl mb-2">🕐</div>
            No saved versions yet
          </div>
        ) : (
          versions.map((v) => (
            <div key={v.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-purple-200 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{v.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    by {v.createdBy.name || "Unknown"} · {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                  </p>
                  {v.summary && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{v.summary}</p>}
                </div>
              </div>
              {canEdit && (
                <button
                  onClick={() => restoreVersion(v.id)}
                  disabled={restoring === v.id}
                  className="mt-2 w-full border border-purple-200 text-purple-600 hover:bg-purple-50 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {restoring === v.id ? "Restoring…" : "↩ Restore this version"}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
