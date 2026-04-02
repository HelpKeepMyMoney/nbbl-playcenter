import {doc, getDoc, onSnapshot, type Unsubscribe} from 'firebase/firestore';
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
