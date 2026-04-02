import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import {getFirebaseDb} from './firebase';

export function subscribeClipLiked(
  clipId: string,
  userId: string,
  onValue: (liked: boolean) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), 'clips', clipId, 'likes', userId),
    snap => onValue(snap.exists()),
    () => onValue(false),
  );
}

/** Toggle like; updates `clips/{clipId}/likes/{userId}` and clip `likeCount`. */
export async function toggleClipLikeFirestore(clipId: string, userId: string): Promise<boolean> {
  const db = getFirebaseDb();
  const clipRef = doc(db, 'clips', clipId);
  const likeRef = doc(db, 'clips', clipId, 'likes', userId);

  return runTransaction(db, async tx => {
    const [likeSnap, clipSnap] = await Promise.all([tx.get(likeRef), tx.get(clipRef)]);
    if (!clipSnap.exists()) {
      throw new Error('Clip not found');
    }
    const prevRaw = clipSnap.data()?.likeCount;
    const prev =
      typeof prevRaw === 'number' && Number.isFinite(prevRaw) ? Math.max(0, Math.floor(prevRaw)) : 0;

    if (likeSnap.exists()) {
      tx.delete(likeRef);
      tx.update(clipRef, {likeCount: Math.max(0, prev - 1)});
      return false;
    }
    tx.set(likeRef, {createdAt: serverTimestamp()});
    tx.update(clipRef, {likeCount: prev + 1});
    return true;
  });
}
