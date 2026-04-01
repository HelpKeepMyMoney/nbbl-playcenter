import {FirebaseError} from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
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

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function formatAuthError(e: unknown): string {
  if (e instanceof FirebaseError) {
    switch (e.code) {
      case 'auth/email-already-in-use':
        return 'That email is already registered. Try signing in.';
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again later.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is disabled in Firebase. Enable Email/Password (and Google if needed) in the console.';
      default:
        break;
    }
  }
  return e instanceof Error ? e.message : 'Something went wrong.';
}
