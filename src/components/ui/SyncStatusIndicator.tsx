"use client";

import { SyncStatus } from "@/types";

interface Props {
  status: SyncStatus;
  pendingCount?: number;
}

const config: Record<SyncStatus, { label: string; color: string; dot: string }> = {
  synced:   { label: "Saved",    color: "text-green-600",  dot: "bg-green-500" },
  pending:  { label: "Unsaved changes", color: "text-amber-600", dot: "bg-amber-500" },
  syncing:  { label: "Syncing…", color: "text-blue-600",   dot: "bg-blue-500 animate-pulse" },
  error:    { label: "Sync error", color: "text-red-600",  dot: "bg-red-500" },
  offline:  { label: "Offline — changes saved locally", color: "text-slate-500", dot: "bg-slate-400" },
};

export default function SyncStatusIndicator({ status, pendingCount }: Props) {
  const c = config[status];
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${c.color}`}>
      <span className={`w-2 h-2 rounded-full inline-block ${c.dot}`} />
      {c.label}
      {pendingCount && pendingCount > 0 ? ` (${pendingCount})` : ""}
    </div>
  );
}
