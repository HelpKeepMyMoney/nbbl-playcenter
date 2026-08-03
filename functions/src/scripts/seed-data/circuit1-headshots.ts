/** Photorealistic portrait headshots — one unique URL per index (0–99). */
export function portraitHeadshotUrl(
  gender: "male" | "female",
  portraitIndex: number
): string {
  const folder = gender === "female" ? "women" : "men";
  const idx = portraitIndex % 100;
  return `https://randomuser.me/api/portraits/${folder}/${idx}.jpg`;
}

export const CIRCUIT1_HEADSHOT_COUNT = 88;
