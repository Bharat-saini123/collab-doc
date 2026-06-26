"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { getYjsProvider, applyServerUpdate } from "@/lib/yjs/provider";
import { useSync } from "@/hooks/useSync";
import EditorToolbar from "./EditorToolbar";
import SyncStatusIndicator from "@/components/ui/SyncStatusIndicator";
import { Role } from "@/types";

// Random color for collaboration cursor
const COLORS = ["#7c3aed", "#db2777", "#059669", "#d97706", "#2563eb", "#dc2626"];
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

interface Props {
  documentId: string;
  userId: string;
  userName: string;
  userImage?: string | null;
  initialTitle: string;
  role: Role;
}

export default function CollaborativeEditor({ documentId, userId, userName, userImage, initialTitle, role }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [titleSaving, setTitleSaving] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const ydocRef = useRef<Y.Doc | null>(null);
  const wsProviderRef = useRef<WebsocketProvider | null>(null);
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userColor = useRef(randomColor()).current;

  const canEdit = role === "OWNER" || role === "EDITOR";

  // Setup Yjs document
  useEffect(() => {
    const { ydoc } = getYjsProvider(documentId);
    ydocRef.current = ydoc;

    // Setup WebSocket provider for real-time collaboration
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234";
    const wsProvider = new WebsocketProvider(wsUrl, documentId, ydoc, {
      connect: true,
      params: { token: "" }, // JWT can be added here
    });

    wsProvider.on("status", ({ status }: { status: string }) => {
      setWsConnected(status === "connected");
    });

    // Set user awareness
    wsProvider.awareness.setLocalStateField("user", {
      name: userName,
      color: userColor,
      image: userImage,
    });

    wsProviderRef.current = wsProvider;

    return () => {
      wsProvider.destroy();
      wsProviderRef.current = null;
    };
  }, [documentId, userName, userImage, userColor]);

  const { syncStatus, pendingCount } = useSync(documentId, userId, ydocRef.current);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydocRef.current || new Y.Doc() }),
      CollaborationCursor.configure({
        provider: wsProviderRef.current!,
        user: { name: userName, color: userColor },
      }),
      Placeholder.configure({ placeholder: "Start writing your document…" }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    editable: canEdit,
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none focus:outline-none min-h-[calc(100vh-200px)] px-16 py-10",
        "aria-label": "Document editor",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
  }, [ydocRef.current]);

  // Debounced title save
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(async () => {
      setTitleSaving(true);
      await fetch(`/api/documents/${documentId}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      setTitleSaving(false);
    }, 800);
  }, [documentId]);

  // Restore from version snapshot
  const restoreSnapshot = useCallback((snapshot: Uint8Array) => {
    if (!ydocRef.current) return;
    applyServerUpdate(ydocRef.current, snapshot);
  }, []);

  const getSelectedText = useCallback(() => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ");
  }, [editor]);

  const getFullText = useCallback(() => {
    return editor?.getText() || "";
  }, [editor]);

  const insertText = useCallback((text: string) => {
    if (!editor || !canEdit) return;
    editor.chain().focus().insertContent(text).run();
  }, [editor, canEdit]);

  return {
    editor,
    title,
    titleSaving,
    wsConnected,
    syncStatus,
    pendingCount,
    canEdit,
    handleTitleChange,
    restoreSnapshot,
    getSelectedText,
    getFullText,
    insertText,
  };
}

// Exported editor UI
export function EditorUI({
  editor,
  title,
  titleSaving,
  wsConnected,
  syncStatus,
  pendingCount,
  canEdit,
  handleTitleChange,
}: ReturnType<typeof CollaborativeEditor>) {
  if (!editor) return null;
  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
      <div className="flex items-center gap-3 px-16 py-3 border-b border-slate-100">
        {canEdit ? (
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-2xl font-bold text-slate-900 bg-transparent border-none outline-none flex-1 placeholder:text-slate-300"
            placeholder="Untitled Document"
            aria-label="Document title"
          />
        ) : (
          <h1 className="text-2xl font-bold text-slate-900 flex-1">{title}</h1>
        )}
        <div className="flex items-center gap-3 shrink-0">
          {titleSaving && <span className="text-xs text-slate-400">Saving title…</span>}
          <div className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500" : "bg-slate-300"}`} title={wsConnected ? "Connected" : "Disconnected"} />
          <SyncStatusIndicator status={syncStatus} pendingCount={pendingCount} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-white">
        {!canEdit && (
          <div className="bg-amber-50 border-b border-amber-200 px-16 py-2 text-amber-700 text-sm">
            👁 You are viewing this document in read-only mode
          </div>
        )}
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
