"use client";

import * as Y from "yjs";
import { localDB, PendingOperation } from "@/lib/db/local";

const MAX_RETRIES = 5;
const BACKOFF_BASE = 1000; // 1s base for exponential backoff
const MAX_PAYLOAD_SIZE = 900 * 1024; // 900KB safety limit

export class SyncEngine {
  private documentId: string;
  private userId: string;
  private ydoc: Y.Doc;
  private isSyncing = false;
  private onlineHandler: () => void;
  private onSyncStatusChange?: (status: "synced" | "pending" | "syncing" | "error") => void;

  constructor(
    documentId: string,
    userId: string,
    ydoc: Y.Doc,
    onSyncStatusChange?: (status: "synced" | "pending" | "syncing" | "error") => void
  ) {
    this.documentId = documentId;
    this.userId = userId;
    this.ydoc = ydoc;
    this.onSyncStatusChange = onSyncStatusChange;

    this.onlineHandler = () => {
      console.log("[SyncEngine] Network restored — starting sync");
      this.syncPendingOperations();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", this.onlineHandler);
    }
  }

  /** Queue a Yjs update for syncing */
  async queueUpdate(update: Uint8Array): Promise<void> {
    if (!localDB) return;

    // OOM prevention: reject oversized payloads
    if (update.byteLength > MAX_PAYLOAD_SIZE) {
      console.error("[SyncEngine] Update too large, skipping queue");
      return;
    }

    const op: PendingOperation = {
      documentId: this.documentId,
      type: "update",
      payload: update,
      timestamp: Date.now(),
      retries: 0,
      userId: this.userId,
    };

    await localDB.pendingOperations.add(op);
    this.onSyncStatusChange?.("pending");

    // Try immediate sync if online
    if (navigator.onLine) {
      this.syncPendingOperations();
    }
  }

  /** Queue a title change */
  async queueTitleUpdate(title: string): Promise<void> {
    if (!localDB) return;
    await localDB.pendingOperations.add({
      documentId: this.documentId,
      type: "title",
      payload: title,
      timestamp: Date.now(),
      retries: 0,
      userId: this.userId,
    });
    if (navigator.onLine) this.syncPendingOperations();
  }

  /** Process all queued operations */
  async syncPendingOperations(): Promise<void> {
    if (this.isSyncing || !localDB || !navigator.onLine) return;
    this.isSyncing = true;
    this.onSyncStatusChange?.("syncing");

    try {
      const pending = await localDB.pendingOperations
        .where("documentId")
        .equals(this.documentId)
        .sortBy("timestamp");

      if (pending.length === 0) {
        this.onSyncStatusChange?.("synced");
        return;
      }

      // First: fetch server state and merge
      await this.fetchAndMerge();

      // Then: push our merged state
      const currentState = Y.encodeStateAsUpdate(this.ydoc);

      if (currentState.byteLength > MAX_PAYLOAD_SIZE) {
        console.error("[SyncEngine] State too large to sync");
        this.onSyncStatusChange?.("error");
        return;
      }

      const res = await fetch(`/api/documents/${this.documentId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: currentState,
      });

      if (!res.ok) throw new Error(`Sync failed: ${res.status}`);

      // Clear synced operations
      const ids = pending.map((op) => op.id!).filter(Boolean);
      await localDB.pendingOperations.bulkDelete(ids);

      // Mark local document as synced
      await localDB.documents.update(this.documentId, { synced: true });
      this.onSyncStatusChange?.("synced");
    } catch (err) {
      console.error("[SyncEngine] Sync error:", err);
      this.onSyncStatusChange?.("error");

      // Exponential backoff retry
      await this.scheduleRetry();
    } finally {
      this.isSyncing = false;
    }
  }

  /** Fetch server state and apply CRDT merge */
  async fetchAndMerge(): Promise<void> {
    const res = await fetch(`/api/documents/${this.documentId}/state`);
    if (!res.ok) return;

    const serverStateBuffer = await res.arrayBuffer();
    const serverUpdate = new Uint8Array(serverStateBuffer);

    if (serverUpdate.byteLength > 0) {
      // CRDT merge: deterministic, no data loss
      Y.applyUpdate(this.ydoc, serverUpdate);
    }
  }

  /** Exponential backoff retry logic */
  private async scheduleRetry(): Promise<void> {
    if (!localDB) return;

    const pending = await localDB.pendingOperations
      .where("documentId")
      .equals(this.documentId)
      .toArray();

    for (const op of pending) {
      if (op.retries >= MAX_RETRIES) {
        // Give up after max retries
        if (op.id) await localDB.pendingOperations.delete(op.id);
        continue;
      }

      if (op.id) {
        await localDB.pendingOperations.update(op.id, { retries: op.retries + 1 });
        const delay = BACKOFF_BASE * Math.pow(2, op.retries);
        setTimeout(() => this.syncPendingOperations(), delay);
      }
    }
  }

  /** Get count of pending operations */
  async getPendingCount(): Promise<number> {
    if (!localDB) return 0;
    return localDB.pendingOperations
      .where("documentId")
      .equals(this.documentId)
      .count();
  }

  destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.onlineHandler);
    }
  }
}
