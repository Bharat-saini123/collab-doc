"use client";

import { Editor } from "@tiptap/react";

interface Props {
  editor: Editor | null;
}

export default function EditorToolbar({ editor }: Props) {
  if (!editor) return null;

  const btn = (active: boolean) =>
    `p-2 rounded-lg text-sm transition-colors ${
      active
        ? "bg-purple-100 text-purple-700"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 flex-wrap bg-white">
      {/* Heading */}
      {([1, 2, 3] as const).map((level) => (
        <button
          key={level}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          className={btn(editor.isActive("heading", { level }))}
          title={`Heading ${level}`}
        >
          H{level}
        </button>
      ))}

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Text formatting */}
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} title="Bold">
        <strong>B</strong>
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} title="Italic">
        <em>I</em>
      </button>
      <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive("underline"))} title="Underline">
        <span className="underline">U</span>
      </button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive("strike"))} title="Strikethrough">
        <span className="line-through">S</span>
      </button>
      <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={btn(editor.isActive("highlight"))} title="Highlight">
        🖊
      </button>
      <button onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive("code"))} title="Inline code">
        {"<>"}
      </button>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Alignment */}
      <button onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btn(editor.isActive({ textAlign: "left" }))} title="Align left">⬅</button>
      <button onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btn(editor.isActive({ textAlign: "center" }))} title="Center">↔</button>
      <button onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btn(editor.isActive({ textAlign: "right" }))} title="Align right">➡</button>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Lists */}
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))} title="Bullet list">•≡</button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))} title="Numbered list">1≡</button>
      <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={btn(editor.isActive("taskList"))} title="Task list">☑</button>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Blocks */}
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))} title="Blockquote">❝</button>
      <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btn(editor.isActive("codeBlock"))} title="Code block">⌨</button>
      <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)} title="Horizontal rule">—</button>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* History */}
      <button onClick={() => { try { editor.chain().focus().undo().run(); } catch { /* no-op if undo unavailable */ } }} disabled={false} className={btn(false)} title="Undo">↩</button>
      <button onClick={() => { try { editor.chain().focus().redo().run(); } catch { /* no-op if redo unavailable */ } }} disabled={false} className={btn(false)} title="Redo">↪</button>
    </div>
  );
}
