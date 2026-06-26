# CollabDoc — Local-First Collaborative Document Editor

A production-grade, real-time collaborative document editor built with Next.js 16, featuring offline-first architecture, CRDT-based conflict resolution, granular version control, AI writing assistance, and role-based access control.

> **Built for House of Edtech Fullstack Developer Assignment 2 — April 2026**

---

## 🚀 Live Demo

**[collabdoc.vercel.app](https://collabdoc.vercel.app)** ← Replace with your deployed URL

---

## ✨ Key Features

### 🔌 Local-First Architecture
- Works **100% offline** — edits are saved to IndexedDB instantly
- Zero blocking network requests on the editor UI
- Background sync engine with exponential backoff retry
- Automatic CRDT merge when connectivity is restored

### 🔀 CRDT Conflict Resolution (Yjs)
- Uses **Yjs** — a battle-tested CRDT library
- Deterministic merge: two users editing the same paragraph offline → zero data loss
- Lamport timestamp ordering for operation sequencing
- 3-way merge semantics via Y.applyUpdate()

### 🕐 Version History & Time Travel
- Save named snapshots at any point
- Full timeline view with author and timestamp
- Restore to any version safely — current state auto-backed-up first
- Versioned as binary Yjs snapshots in PostgreSQL

### 👥 Real-Time Collaboration
- WebSocket-based live cursor positions (y-websocket)
- Color-coded user presence indicators
- Role enforcement: Owner / Editor / Viewer
- Viewers **cannot** push state updates (enforced server-side)

### 🤖 AI Writing Assistant (Groq/OpenAI)
- Continue writing, improve text, fix grammar
- Summarize documents
- Explain conflict merges in plain language
- Insert AI output directly into editor

### 🔐 Security
- JWT-based sessions via NextAuth.js v5
- **OOM Prevention**: 1MB payload hard limit on all sync endpoints
- Row-level access control (document collaborators table)
- Zod schema validation on all API inputs
- Rate limiting ready (Upstash Redis)

---

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16 + TypeScript |
| Editor | Tiptap (ProseMirror) |
| CRDT Engine | Yjs + y-indexeddb |
| Real-time WS | y-websocket |
| Local Storage | Dexie.js (IndexedDB) |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| Auth | NextAuth.js v5 |
| AI | Groq (llama-3.1) / OpenAI |
| Styling | Tailwind CSS + Radix UI |
| Deploy | Vercel + GitHub Actions |

---

## ⚡ Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/collab-doc.git
cd collab-doc
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Fill in your values:
- `DATABASE_URL` — PostgreSQL connection string (get from [Supabase](https://supabase.com))
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `GITHUB_CLIENT_ID/SECRET` — from GitHub OAuth App
- `GOOGLE_CLIENT_ID/SECRET` — from Google Cloud Console
- `GROQ_API_KEY` — from [console.groq.com](https://console.groq.com) (free)
- `NEXT_PUBLIC_WS_URL` — your Hocuspocus WebSocket server URL

### 3. Database Setup

```bash
# Push schema to PostgreSQL
npx prisma db push

# Generate Prisma client
npx prisma generate

# (Optional) Open Prisma Studio
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. WebSocket Server (for real-time collab)

Install and run a Hocuspocus or y-websocket server:

```bash
# Simple y-websocket server
npx y-websocket-server
# Runs on ws://localhost:1234
```

---

## 🏗 Architecture Deep Dive

### Offline → Online Sync Flow

```
User edits offline
    ↓
Yjs update generated → saved to IndexedDB queue (Dexie.js)
    ↓
Network restored (navigator.onLine event fires)
    ↓
SyncEngine.syncPendingOperations() runs
    ↓
1. Fetch server Yjs state via GET /api/documents/[id]/state
2. Y.applyUpdate(ydoc, serverState)  ← CRDT deterministic merge
3. Push merged state via POST /api/documents/[id]/sync
4. Clear pending queue
    ↓
Broadcast to collaborators via WebSocket
```

### Security Architecture

**OOM Prevention (server-side):**
```typescript
// Hard limit: reject anything over 1MB before reading body
const contentLength = parseInt(req.headers.get('content-length') || '0')
if (contentLength > 1_000_000) {
  return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
}
```

**Role Enforcement:**
- `VIEWER` role → 403 on all write endpoints
- Checked at API layer, not just UI
- Row-level: users can only access docs they're collaborators on

**Input Validation:**
- Every API endpoint uses Zod schemas
- Binary Yjs data validated for size before storage

### CRDT Conflict Resolution

Yjs provides **Conflict-Free Replicated Data Types**:
- Every character insertion is a unique operation with a Lamport timestamp
- Two users inserting text at the same position → both preserved, deterministic ordering
- No "last write wins" — all changes are merged
- `Y.applyUpdate()` is the merge function — idempotent and commutative

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           ← NextAuth + register
│   │   ├── documents/      ← CRUD + sync + versions + share
│   │   └── ai/             ← AI assistant endpoint
│   ├── auth/               ← Login + signup pages
│   ├── dashboard/          ← Document list
│   └── doc/[id]/           ← Main editor
├── components/
│   ├── editor/             ← Tiptap editor + toolbar
│   ├── sidebar/            ← Version history + share panel
│   ├── ai/                 ← AI assistant UI
│   └── ui/                 ← Shared UI components
├── lib/
│   ├── auth/               ← NextAuth config
│   ├── db/                 ← Prisma + Dexie
│   ├── sync/               ← Offline sync engine
│   └── yjs/                ← Yjs provider + helpers
├── hooks/                  ← useOnlineStatus, useSync
└── types/                  ← TypeScript interfaces
```

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### CI/CD

GitHub Actions workflow at `.github/workflows/ci.yml`:
- **On PR**: Lint + TypeScript check
- **On main push**: Auto-deploy to Vercel

---

## 🔮 Future Improvements

- Hocuspocus server for production WebSocket (with JWT auth on handshake)
- Upstash Redis rate limiting
- End-to-end tests with Playwright
- Document export (PDF, DOCX)
- Comments and suggestions mode
- Mobile-responsive editor
- Document templates

---

## 👤 Author

- **Name**: Your Name
- **GitHub**: [github.com/yourusername](https://github.com/yourusername)
- **LinkedIn**: [linkedin.com/in/yourusername](https://linkedin.com/in/yourusername)
