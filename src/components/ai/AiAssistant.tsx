"use client";

import { useState } from "react";
import { AiAction } from "@/types";

interface Props {
  getSelectedText: () => string;
  getFullText: () => string;
  onInsert: (text: string) => void;
}

const actions: { key: AiAction; label: string; icon: string; desc: string }[] = [
  { key: "complete",         label: "Continue Writing",  icon: "✍️", desc: "AI continues from where you left off" },
  { key: "improve",          label: "Improve Writing",   icon: "✨", desc: "Fix style, grammar, clarity" },
  { key: "grammar",          label: "Fix Grammar",       icon: "📝", desc: "Correct spelling and grammar" },
  { key: "summarize",        label: "Summarize Doc",     icon: "📋", desc: "Get a quick summary" },
  { key: "explain_conflict", label: "Explain Changes",   icon: "🔀", desc: "Understand what changed in merges" },
];

export default function AiAssistant({ getSelectedText, getFullText, onInsert }: Props) {
  const [action, setAction] = useState<AiAction>("complete");
  const [customPrompt, setCustomPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runAi() {
    setLoading(true);
    setError("");
    setResult("");

    const selected = getSelectedText();
    const full = getFullText();
    const prompt = customPrompt.trim() || selected || full.slice(0, 1000);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          prompt,
          context: action !== "complete" ? full.slice(0, 3000) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "AI request failed");
        return;
      }

      const data = await res.json();
      setResult(data.result);
    } catch {
      setError("Failed to connect to AI service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
          <span>🤖</span> AI Assistant
        </h2>

        {/* Action selector */}
        <div className="space-y-1 mb-3">
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={() => setAction(a.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                action === a.key
                  ? "bg-purple-100 text-purple-800 font-medium"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {a.icon} {a.label}
              {action === a.key && <p className="text-xs text-purple-600 mt-0.5">{a.desc}</p>}
            </button>
          ))}
        </div>

        {/* Custom prompt */}
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Optional: add specific instructions…"
          rows={2}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 mb-2"
        />

        <button
          onClick={runAi}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-semibold transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Thinking…
            </span>
          ) : (
            "✨ Generate"
          )}
        </button>
      </div>

      {/* Result */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-3">
            {error}
          </div>
        )}
        {result && (
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {result}
            </div>
            <button
              onClick={() => onInsert(result)}
              className="w-full border border-purple-200 text-purple-700 hover:bg-purple-50 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              ↗ Insert into document
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(result); }}
              className="w-full border border-slate-200 text-slate-600 hover:bg-slate-50 py-2 rounded-lg text-sm transition-colors"
            >
              📋 Copy to clipboard
            </button>
          </div>
        )}
        {!result && !error && !loading && (
          <div className="text-center text-slate-400 text-sm py-8">
            <div className="text-4xl mb-2">🤖</div>
            Select text in the editor or describe what you need, then click Generate.
          </div>
        )}
      </div>
    </div>
  );
}
