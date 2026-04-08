import {collection, doc, getDoc, onSnapshot, type Unsubscribe} from 'firebase/firestore';
import {getFirebaseDb} from './firebase';

/** True if `admins/{uid}` exists. Document can be empty `{}`. */
export async function isUserAdmin(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(getFirebaseDb(), 'admins', uid));
  return snap.exists();
}

export function subscribeIsUserAdmin(uid: string, onValue: (isAdmin: boolean) => void): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), 'admins', uid),
    snap => onValue(snap.exists()),
    () => onValue(false),
  );
}

/** All admin UIDs (moderators only — requires `firestore.rules` allowing admins to read `admins/*`). */
export function subscribeToAdminUids(
  onData: (uids: Set<string>) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(getFirebaseDb(), 'admins'),
    snap => {
      onData(new Set(snap.docs.map(d => d.id)));
    },
    err => onError(err instanceof Error ? err : new Error(String(err))),
  );
}
