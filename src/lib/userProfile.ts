import type {User} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
  type Unsubscribe,
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

const ADMIN_USER_LIST_LIMIT = 500;
const ADMIN_DISPLAY_MAX = 199;
const ADMIN_EMAIL_MAX = 319;
const ADMIN_CITY_MAX = 119;
const ADMIN_PHOTO_URL_MAX = 2047;

export interface AdminUserListRow {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  city: string;
  updatedAt: Date | null;
  createdAt: Date | null;
}

function timestampToDate(v: unknown): Date | null {
  if (v instanceof Timestamp) return v.toDate();
  return null;
}

function docToAdminUserRow(uid: string, data: Record<string, unknown>): AdminUserListRow {
  return {
    uid,
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    email: typeof data.email === 'string' ? data.email : '',
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    city: typeof data.city === 'string' ? data.city : '',
    updatedAt: timestampToDate(data.updatedAt),
    createdAt: timestampToDate(data.createdAt),
  };
}

/** Real-time list for admin UI (newest `updatedAt` first, capped). */
export function subscribeToUsersForAdmin(
  onData: (users: AdminUserListRow[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const q = query(collection(db, 'users'), limit(ADMIN_USER_LIST_LIMIT));
  return onSnapshot(
    q,
    snap => {
      const rows = snap.docs.map(d => docToAdminUserRow(d.id, d.data() as Record<string, unknown>));
      rows.sort(
        (a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
      );
      onData(rows);
    },
    err => onError(err instanceof Error ? err : new Error(String(err))),
  );
}

export interface AdminUserProfilePatch {
  displayName: string;
  email: string;
  photoURL: string | null;
  city: string;
}

/** Admin-only Firestore update; does not change Firebase Auth. */
export async function adminUpdateUserProfileFirestore(
  uid: string,
  patch: AdminUserProfilePatch,
): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('User profile not found');
  }
  const photo =
    patch.photoURL == null || patch.photoURL.trim() === ''
      ? null
      : patch.photoURL.trim().slice(0, ADMIN_PHOTO_URL_MAX);
  await updateDoc(ref, {
    displayName: patch.displayName.trim().slice(0, ADMIN_DISPLAY_MAX),
    email: patch.email.trim().slice(0, ADMIN_EMAIL_MAX),
    photoURL: photo,
    city: patch.city.trim().slice(0, ADMIN_CITY_MAX),
    updatedAt: serverTimestamp(),
  });
}

/** Removes `users/{uid}` only (Firebase Auth account is unchanged). */
export async function adminDeleteUserProfileFirestore(uid: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'users', uid));
}
