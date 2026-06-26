import Dexie, { Table } from "dexie";

export interface LocalDocument {
  id: string;
  title: string;
  yjsState: Uint8Array;
  updatedAt: number;
  synced: boolean;
  serverId?: string;
}

export interface PendingOperation {
  id?: number;
  documentId: string;
  type: "update" | "title" | "create";
  payload: Uint8Array | string;
  timestamp: number;
  retries: number;
  userId: string;
}

export interface LocalVersion {
  id: string;
  documentId: string;
  title: string;
  yjsSnapshot: Uint8Array;
  createdAt: number;
  synced: boolean;
}

export class CollabDocDB extends Dexie {
  documents!: Table<LocalDocument>;
  pendingOperations!: Table<PendingOperation>;
  versions!: Table<LocalVersion>;

  constructor() {
    super("CollabDocDB");
    this.version(1).stores({
      documents: "id, updatedAt, synced",
      pendingOperations: "++id, documentId, timestamp, retries",
      versions: "id, documentId, createdAt, synced",
    });
  }
}

export const localDB = typeof window !== "undefined" ? new CollabDocDB() : null;
