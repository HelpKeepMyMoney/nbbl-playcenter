import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {getFirebaseAuth} from './firebase';

const googleProvider = new GoogleAuthProvider();

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(getFirebaseAuth(), googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}
