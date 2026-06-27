"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { SyncEngine } from "@/lib/sync/engine";
import EditorToolbar from "@/components/editor/EditorToolbar";
import SyncStatusIndicator from "@/components/ui/SyncStatusIndicator";
import VersionHistory from "@/components/sidebar/VersionHistory";
import SharePanel from "@/components/sidebar/SharePanel";
import AiAssistant from "@/components/ai/AiAssistant";
import { Document, Role, SyncStatus } from "@/types";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

type SidePanel = "versions" | "share" | "ai" | null;

interface Props {
  document: Document;
  user: { id: string; name?: string | null; image?: string | null };
  role: Role;
}

export default function DocPageClient({ document: initialDoc, user, role }: Props) {
  const [doc, setDoc] = useState(initialDoc);
  const [title, setTitle] = useState(initialDoc.title);
  const [titleSaving, setTitleSaving] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [pendingCount, setPendingCount] = useState(0);
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);

  const ydocRef = useRef<Y.Doc | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const titleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOnline = useOnlineStatus();
  const canEdit = role === "OWNER" || role === "EDITOR";

  useEffect(() => {
    const newYdoc = new Y.Doc();
    ydocRef.current = newYdoc;
    setYdoc(newYdoc);

    const persistence = new IndexeddbPersistence(`collab-doc-${initialDoc.id}`, newYdoc);
    persistenceRef.current = persistence;

    persistence.on("synced", async () => {
      if (navigator.onLine) {
        try {
          const res = await fetch(`/api/documents/${initialDoc.id}/state`);
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            const serverState = new Uint8Array(buffer);
            if (serverState.byteLength > 0) {
              Y.applyUpdate(newYdoc, serverState, "server");
            }
          }
        } catch (e) {
          console.error("[DocPage] Failed to fetch server state", e);
        }
      }
    });

    const engine = new SyncEngine(initialDoc.id, user.id, newYdoc, (status) => {
      setSyncStatus(status);
    });
    syncEngineRef.current = engine;

    newYdoc.on("update", async (update: Uint8Array, origin: unknown) => {
      if (origin === "server" || !canEdit) return;
      await engine.queueUpdate(update);
      const count = await engine.getPendingCount();
      setPendingCount(count);
    });

    return () => {
      engine.destroy();
      persistence.destroy();
      newYdoc.destroy();
      syncEngineRef.current = null;
      persistenceRef.current = null;
      ydocRef.current = null;
      setYdoc(null);
    };
  }, [initialDoc.id, user.id]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        Placeholder.configure({ placeholder: "Start writing your document…" }),
        Underline,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Highlight,
        TaskList,
        TaskItem.configure({ nested: true }),
        ...(ydoc ? [Collaboration.configure({ document: ydoc })] : []),
      ],
      editable: canEdit,
      editorProps: {
        attributes: {
          class: "focus:outline-none",
          "aria-label": "Document editor",
          role: "textbox",
          "aria-multiline": "true",
        },
      },
    },
    [ydoc]
  );

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    titleTimerRef.current = setTimeout(async () => {
      setTitleSaving(true);
      try {
        await fetch(`/api/documents/${initialDoc.id}/state`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
      } finally {
        setTitleSaving(false);
      }
    }, 800);
  }, [initialDoc.id]);

  const handleRestore = useCallback((snapshot: Uint8Array) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    Y.applyUpdate(ydoc, snapshot, "server");
    indexedDB.deleteDatabase(`collab-doc-${initialDoc.id}`);
    setTimeout(() => window.location.reload(), 300);
  }, [initialDoc.id]);

  const getSelectedText = useCallback(() => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ");
  }, [editor]);

  const getFullText = useCallback(() => editor?.getText() || "", [editor]);

  const insertText = useCallback((text: string) => {
    if (!editor || !canEdit) return;
    editor.chain().focus().insertContent(text).run();
  }, [editor, canEdit]);

  const refreshDoc = useCallback(async () => {
    const res = await fetch(`/api/documents/${initialDoc.id}/state`);
    if (res.ok) {
      const docRes = await fetch(`/api/documents`);
      if (docRes.ok) {
        const docs = await docRes.json();
        const updated = docs.find((d: Document) => d.id === initialDoc.id);
        if (updated) setDoc(updated);
      }
    }
  }, [initialDoc.id]);

  const togglePanel = (panel: SidePanel) => {
    setSidePanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0 z-10">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-800 transition-colors p-1.5 rounded-lg hover:bg-slate-100" title="Back to dashboard">
          ←
        </Link>
        <div className="w-px h-5 bg-slate-200" />
        <div className="flex-1 flex items-center gap-2">
          {canEdit ? (
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-sm font-semibold text-slate-900 bg-transparent border-none outline-none max-w-xs placeholder:text-slate-400"
              placeholder="Untitled Document"
              aria-label="Document title"
            />
          ) : (
            <span className="text-sm font-semibold text-slate-900">{title}</span>
          )}
          {titleSaving && <span className="text-xs text-slate-400">saving…</span>}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            role === "OWNER" ? "bg-purple-100 text-purple-700" :
            role === "EDITOR" ? "bg-blue-100 text-blue-700" :
            "bg-slate-100 text-slate-600"
          }`}>
            {role}
          </span>

          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} title={isOnline ? "Online" : "Offline"} />
            <SyncStatusIndicator status={isOnline ? syncStatus : "offline"} pendingCount={pendingCount} />
          </div>

          <div className="w-px h-5 bg-slate-200" />

          {canEdit && (
            <button
              onClick={() => togglePanel("ai")}
              className={`p-2 rounded-lg text-sm transition-colors ${sidePanel === "ai" ? "bg-purple-100 text-purple-700" : "text-slate-600 hover:bg-slate-100"}`}
              title="AI Assistant"
            >
              🤖
            </button>
          )}
          <button
            onClick={() => togglePanel("versions")}
            className={`p-2 rounded-lg text-sm transition-colors ${sidePanel === "versions" ? "bg-purple-100 text-purple-700" : "text-slate-600 hover:bg-slate-100"}`}
            title="Version History"
          >
            🕐
          </button>
          <button
            onClick={() => togglePanel("share")}
            className={`p-2 rounded-lg text-sm transition-colors ${sidePanel === "share" ? "bg-purple-100 text-purple-700" : "text-slate-600 hover:bg-slate-100"}`}
            title="Share"
          >
            👥
          </button>

          <div className="w-7 h-7 rounded-full bg-purple-200 flex items-center justify-center text-xs font-semibold text-purple-700 ml-1">
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorToolbar editor={editor} />
          {!canEdit && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-amber-700 text-sm shrink-0">
              👁 Read-only — you have Viewer access to this document
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-16 py-12">
              {editor ? (
                <EditorContent editor={editor} />
              ) : (
                <div className="text-slate-400 text-sm">Loading editor…</div>
              )}
            </div>
          </div>
        </div>

        {sidePanel && (
          <div className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden">
            <div className="flex items-center border-b border-slate-200 px-3 py-2 gap-1 shrink-0">
              {(["versions", "share", ...(canEdit ? ["ai"] : [])] as SidePanel[]).filter(Boolean).map((p) => (
                <button
                  key={p!}
                  onClick={() => setSidePanel(p)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    sidePanel === p ? "bg-purple-100 text-purple-700" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {p === "versions" ? "🕐 History" : p === "share" ? "👥 Share" : "🤖 AI"}
                </button>
              ))}
              <button onClick={() => setSidePanel(null)} className="text-slate-400 hover:text-slate-700 p-1 ml-1">✕</button>
            </div>

            <div className="flex-1 overflow-hidden">
              {sidePanel === "versions" && (
                <VersionHistory
                  documentId={initialDoc.id}
                  ydoc={ydocRef.current}
                  onRestore={handleRestore}
                  canEdit={canEdit}
                />
              )}
              {sidePanel === "share" && (
                <SharePanel
                  documentId={initialDoc.id}
                  collaborators={doc.collaborators}
                  currentUserId={user.id}
                  currentUserRole={role}
                  onUpdate={refreshDoc}
                />
              )}
              {sidePanel === "ai" && canEdit && (
                <AiAssistant
                  getSelectedText={getSelectedText}
                  getFullText={getFullText}
                  onInsert={insertText}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-slate-100 py-2 px-6 text-center text-slate-400 text-xs shrink-0">
        Built by{" "}
        <a href="https://github.com/Bharat-saini123" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">Bharat Saini</a>
        {" · "}
        <a href="https://github.com/Bharat-saini123/collab-doc" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">GitHub</a>
        {" · "}
        <a href="https://www.linkedin.com/in/bharat-saini-146412273/" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">LinkedIn</a>
      </footer>
    </div>
  );
}
