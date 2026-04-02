import type {User} from 'firebase/auth';
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {getFirebaseAuth, getFirebaseDb} from './firebase';

/** Firestore `users/{uid}` — mirrors Auth + timestamps for the console and admin UI */
export interface UserProfileFirestore {
  displayName: string;
  email: string;
  photoURL: string | null;
  city: string;
  updatedAt: unknown;
  createdAt?: unknown;
}

export async function upsertUserProfileFromAuth(user: User): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const prev = snap.data();
  const city =
    typeof prev?.city === 'string' ? prev.city : '';
  await setDoc(
    ref,
    {
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      photoURL: user.photoURL ?? null,
      city,
      updatedAt: serverTimestamp(),
      ...(snap.exists() ? {} : {createdAt: serverTimestamp()}),
    },
    {merge: true},
  );
}

const CITY_MAX = 120;

export async function updateUserProfileCity(uid: string, city: string): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'users', uid), {
    city: city.trim().slice(0, CITY_MAX),
    updatedAt: serverTimestamp(),
  });
}

/** Call after Auth profile mutations (name/photo) so `currentUser` is up to date. */
export async function syncCurrentUserProfileDoc(): Promise<void> {
  const u = getFirebaseAuth().currentUser;
  if (u) await upsertUserProfileFromAuth(u);
}

const FIRESTORE_IN_LIMIT = 10;

export type UserProfilePublic = {
  displayName: string;
  email: string;
  photoURL: string | null;
  city: string;
};

/** Batch-fetch profiles for moderator UI (max 10 IDs per Firestore `in` query). */
export async function fetchUserProfilesByIds(uids: string[]): Promise<Map<string, UserProfilePublic>> {
  const unique = [...new Set(uids.filter(Boolean))];
  const db = getFirebaseDb();
  const map = new Map<string, UserProfilePublic>();
  for (let i = 0; i < unique.length; i += FIRESTORE_IN_LIMIT) {
    const chunk = unique.slice(i, i + FIRESTORE_IN_LIMIT);
    const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      const data = d.data();
      map.set(d.id, {
        displayName: typeof data.displayName === 'string' ? data.displayName : '',
        email: typeof data.email === 'string' ? data.email : '',
        photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
        city: typeof data.city === 'string' ? data.city : '',
      });
    });
  }
  return map;
}
