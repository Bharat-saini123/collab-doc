"use client";

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { localDB } from "@/lib/db/local";

export interface YjsProviderResult {
  ydoc: Y.Doc;
  persistence: IndexeddbPersistence;
  destroy: () => void;
}

const docCache = new Map<string, YjsProviderResult>();

export function getYjsProvider(documentId: string): YjsProviderResult {
  if (docCache.has(documentId)) {
    return docCache.get(documentId)!;
  }

  const ydoc = new Y.Doc();

  // Persist to IndexedDB automatically
  const persistence = new IndexeddbPersistence(`collab-doc-${documentId}`, ydoc);

  persistence.on("synced", () => {
    console.log(`[Yjs] Loaded from IndexedDB: ${documentId}`);
  });

  // Save to our Dexie DB on every update for backup
  ydoc.on("update", async (update: Uint8Array) => {
    if (!localDB) return;
    const state = Y.encodeStateAsUpdate(ydoc);
    await localDB.documents.put({
      id: documentId,
      title: ydoc.getMap("meta").get("title") as string || "Untitled",
      yjsState: state,
      updatedAt: Date.now(),
      synced: false,
    });
  });

  const result: YjsProviderResult = {
    ydoc,
    persistence,
    destroy: () => {
      persistence.destroy();
      ydoc.destroy();
      docCache.delete(documentId);
    },
  };

  docCache.set(documentId, result);
  return result;
}

/** Encode Yjs doc state for server transmission */
export function encodeDocState(ydoc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(ydoc);
}

/** Apply server state update to local doc (CRDT merge) */
export function applyServerUpdate(ydoc: Y.Doc, update: Uint8Array): void {
  Y.applyUpdate(ydoc, update);
}

/** Create a snapshot of the current document state */
export function createSnapshot(ydoc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(ydoc);
}

/** Restore document to a snapshot */
export function restoreFromSnapshot(ydoc: Y.Doc, snapshot: Uint8Array): Y.Doc {
  // Create a fresh doc and apply snapshot — doesn't corrupt current shared state
  const restoredDoc = new Y.Doc();
  Y.applyUpdate(restoredDoc, snapshot);
  return restoredDoc;
}
