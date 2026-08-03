function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function mixSeed(seed: number, salt: number): number {
  return Math.abs((seed * 31 + salt * 17) | 0);
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h % 360}, ${s}%, ${l}%)`;
}

type AvatarToneGroup = "black" | "asian" | "hispanic" | "white";

const TONE_GROUPS: AvatarToneGroup[] = [
  "black",
  "asian",
  "hispanic",
  "white",
];

function toneGroupForSeed(seed: number): AvatarToneGroup {
  return TONE_GROUPS[seed % TONE_GROUPS.length];
}

function skinTone(group: AvatarToneGroup, seed: number): string {
  const v = mixSeed(seed, 1);
  switch (group) {
    case "black": {
      const l = 34 + (v % 18);
      const h = 26 + (mixSeed(seed, 2) % 10);
      const s = 36 + (mixSeed(seed, 3) % 14);
      return hsl(h, s, l);
    }
    case "asian": {
      const l = 64 + (v % 16);
      const h = 32 + (mixSeed(seed, 2) % 12);
      const s = 28 + (mixSeed(seed, 3) % 18);
      return hsl(h, s, l);
    }
    case "hispanic": {
      const l = 48 + (v % 20);
      const h = 22 + (mixSeed(seed, 2) % 14);
      const s = 40 + (mixSeed(seed, 3) % 16);
      return hsl(h, s, l);
    }
    case "white": {
      const l = 76 + (v % 12);
      const h = 24 + (mixSeed(seed, 2) % 10);
      const s = 18 + (mixSeed(seed, 3) % 16);
      return hsl(h, s, l);
    }
  }
}

function hairTone(group: AvatarToneGroup, seed: number): string {
  const v = mixSeed(seed, 4);
  switch (group) {
    case "black":
      return hsl(30 + (v % 8), 22, 10 + (v % 10));
    case "asian":
      return hsl(28 + (v % 10), 32, 8 + (v % 12));
    case "hispanic":
      return hsl(25 + (v % 18), 42, 18 + (v % 20));
    case "white": {
      const blonde = v % 4 === 0;
      if (blonde) {
        return hsl(42 + (v % 12), 55, 48 + (v % 18));
      }
      return hsl(30 + (v % 15), 28, 24 + (v % 22));
    }
  }
}

export function participantAvatarPath(participantId: string): string {
  return `/api/participants/${participantId}/avatar`;
}

/** Deterministic portrait-style SVG avatar for a participant. */
export function buildParticipantAvatarSvg(
  participantId: string,
  firstName: string,
  lastName: string
): string {
  const seed = hashId(participantId);
  const toneGroup = toneGroupForSeed(seed);
  const bg1 = hsl(seed % 360, 55, 42);
  const bg2 = hsl((seed + 55) % 360, 60, 28);
  const jersey = hsl((seed + 120) % 360, 70, 38);
  const skin = skinTone(toneGroup, seed);
  const hair = hairTone(toneGroup, seed);
  const variant = mixSeed(seed, 5) % 3;

  const hairPath =
    variant === 0
      ? `<path d="M50 38 C38 38 32 52 32 68 L32 78 L68 78 L68 68 C68 52 62 38 50 38 Z" fill="${hair}"/>`
      : variant === 1
        ? `<ellipse cx="50" cy="58" rx="22" ry="24" fill="${hair}"/><rect x="32" y="58" width="36" height="22" fill="${hair}"/>`
        : `<path d="M50 36 C40 36 30 48 28 62 L28 76 L72 76 L72 62 C70 48 60 36 50 36 Z" fill="${hair}"/>`;

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  const safeName = `${firstName} ${lastName}`.replace(/"/g, "'");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${safeName}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <clipPath id="clip">
      <circle cx="50" cy="50" r="50"/>
    </clipPath>
  </defs>
  <g clip-path="url(#clip)">
    <rect width="100" height="100" fill="url(#bg)"/>
    <ellipse cx="50" cy="108" rx="42" ry="38" fill="${jersey}"/>
    <path d="M28 95 Q50 78 72 95 L72 100 L28 100 Z" fill="${jersey}" opacity="0.9"/>
    <circle cx="50" cy="52" r="18" fill="${skin}"/>
    ${hairPath}
    <ellipse cx="43" cy="52" rx="2" ry="2.5" fill="#1f2937"/>
    <ellipse cx="57" cy="52" rx="2" ry="2.5" fill="#1f2937"/>
    <path d="M44 60 Q50 64 56 60" stroke="#9ca3af" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <text x="50" y="92" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="white" opacity="0.95">${initials}</text>
  </g>
</svg>`;
}
