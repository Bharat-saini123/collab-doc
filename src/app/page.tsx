import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-white font-bold text-xl">CollabDoc</span>
        </div>
        <div className="flex gap-3">
          <Link href="/auth/login" className="text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm">
            Sign In
          </Link>
          <Link href="/auth/signup" className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium">
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
        <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm px-4 py-1.5 rounded-full mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          Local-First · Real-Time · Offline-Ready
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Write Together,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Anywhere, Anytime
          </span>
        </h1>

        <p className="text-slate-400 text-xl max-w-2xl mb-10 leading-relaxed">
          CollabDoc works without internet. Your changes sync automatically when you're back online —
          with zero data loss using CRDT-based conflict resolution.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/auth/signup" className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors">
            Start Writing Free →
          </Link>
          <Link href="/auth/login" className="border border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors">
            Sign In
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 max-w-4xl w-full">
          {[
            { icon: "⚡", title: "Offline-First", desc: "Edit without internet. Everything syncs when you reconnect." },
            { icon: "🔀", title: "CRDT Merging", desc: "Deterministic conflict resolution — no data ever lost." },
            { icon: "🕐", title: "Version History", desc: "Time-travel through every saved version of your document." },
            { icon: "👥", title: "Real-Time Collaboration", desc: "See teammates' cursors live with WebSocket sync." },
            { icon: "🤖", title: "AI Assistant", desc: "Built-in AI for writing, summarizing, and improving text." },
            { icon: "🔐", title: "Role-Based Access", desc: "Owner, Editor, Viewer — granular permission control." },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left hover:bg-white/10 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-8 text-center text-slate-500 text-sm">
        <p>
          Built by{" "}
          <a href="https://github.com/yourusername" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
            Your Name
          </a>{" "}
          ·{" "}
          <a href="https://github.com/yourusername/collab-doc" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
            GitHub
          </a>{" "}
          ·{" "}
          <a href="https://linkedin.com/in/yourusername" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
            LinkedIn
          </a>
        </p>
      </footer>
    </main>
  );
}
