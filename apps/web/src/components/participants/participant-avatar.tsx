"use client";

import { cn } from "@/lib/utils";
import { participantAvatarPath } from "@/lib/participant-avatar-svg";
import type { ParticipantDoc } from "@/types/firestore";

export function ParticipantAvatar({
  participant,
  size = "lg",
  className,
}: {
  participant: Pick<ParticipantDoc, "id" | "firstName" | "lastName" | "avatarUrl">;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = { sm: 32, md: 40, lg: 96 }[size];
  const query = new URLSearchParams({
    firstName: participant.firstName,
    lastName: participant.lastName,
    v: "2",
  });
  const generatedSrc = `${participantAvatarPath(participant.id)}?${query.toString()}`;
  const stored = participant.avatarUrl?.trim();
  const src =
    stored &&
    stored.startsWith("http") &&
    !stored.includes("/api/participants/")
      ? stored
      : generatedSrc;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamic SVG API route
    <img
      src={src}
      alt={`${participant.firstName} ${participant.lastName}`}
      width={dims}
      height={dims}
      className={cn(
        "shrink-0 rounded-full object-cover ring-2 ring-white",
        className
      )}
    />
  );
}
