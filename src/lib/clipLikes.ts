const STORAGE_KEY = 'nbbl-playcenter-clip-likes';

function readIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(arr) ? (arr as string[]) : []);
  } catch {
    return new Set();
  }
}

export function isClipLiked(id: string): boolean {
  return readIds().has(id);
}

/** Returns new liked state after toggle. */
export function toggleClipLike(id: string): boolean {
  const set = readIds();
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  return set.has(id);
}

export function removeClipLike(id: string): void {
  const set = readIds();
  if (!set.has(id)) return;
  set.delete(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}
