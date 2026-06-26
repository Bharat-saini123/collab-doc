"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Y from "yjs";
import { SyncEngine } from "@/lib/sync/engine";
import { SyncStatus } from "@/types";
import { useOnlineStatus } from "./useOnlineStatus";

export function useSync(documentId: string, userId: string, ydoc: Y.Doc | null) {
  const engineRef = useRef<SyncEngine | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [pendingCount, setPendingCount] = useState(0);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!ydoc || !documentId || !userId) return;

    const engine = new SyncEngine(documentId, userId, ydoc, (status) => {
      setSyncStatus(status);
    });
    engineRef.current = engine;

    // Listen to Yjs updates and queue them
    const updateHandler = (update: Uint8Array, origin: unknown) => {
      // Don't re-queue updates that came from the server
      if (origin === "server") return;
      engine.queueUpdate(update);
      engine.getPendingCount().then(setPendingCount);
    };

    ydoc.on("update", updateHandler);

    // Initial sync if online
    if (navigator.onLine) {
      engine.fetchAndMerge().then(() => {
        setSyncStatus("synced");
      });
    }

    return () => {
      ydoc.off("update", updateHandler);
      engine.destroy();
      engineRef.current = null;
    };
  }, [documentId, userId, ydoc]);

  useEffect(() => {
    if (!isOnline) setSyncStatus("offline");
  }, [isOnline]);

  const forcSync = useCallback(() => {
    engineRef.current?.syncPendingOperations();
  }, []);

  return { syncStatus, pendingCount, forcSync };
}
