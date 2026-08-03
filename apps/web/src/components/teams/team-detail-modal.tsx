"use client";

import { X } from "lucide-react";
import { TeamDetailPane } from "@/components/teams/team-detail-pane";
import type { TeamDoc } from "@/types/firestore";

export function TeamDetailModal({
  team,
  orgName,
  open,
  onClose,
  getPlayerProfileHref,
}: {
  team: TeamDoc;
  orgName?: string;
  open: boolean;
  onClose: () => void;
  getPlayerProfileHref?: (participantId: string) => string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-detail-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <TeamDetailPane
          team={team}
          orgName={orgName}
          className="min-h-0 flex-1"
          getPlayerProfileHref={getPlayerProfileHref}
        />
      </div>
    </div>
  );
}
