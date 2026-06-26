export type Role = "OWNER" | "EDITOR" | "VIEWER";

export interface UserMeta {
  id: string;
  name: string | null;
  image: string | null;
  email?: string;
}

export interface Document {
  id: string;
  title: string;
  content?: unknown;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner: UserMeta;
  collaborators: Collaborator[];
  _count?: { versions: number };
}

export interface Collaborator {
  id: string;
  documentId: string;
  userId: string;
  role: Role;
  user: UserMeta;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  title: string;
  summary?: string | null;
  createdAt: string;
  createdBy: UserMeta;
  snapshot?: string; // base64 yjs state
}

export type SyncStatus = "synced" | "pending" | "syncing" | "error" | "offline";

export type AiAction = "complete" | "summarize" | "improve" | "explain_conflict" | "grammar";
