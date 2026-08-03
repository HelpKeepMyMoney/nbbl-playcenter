import {FirebaseError} from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import {getDownloadURL, ref, uploadBytes} from 'firebase/storage';
import {getFirebaseAuth, getFirebaseStorage} from './firebase';

const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

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

export function userHasPasswordProvider(user: User): boolean {
  return user.providerData.some(p => p.providerId === 'password');
}

export async function saveUserDisplayName(user: User, displayName: string): Promise<void> {
  const trimmed = displayName.trim();
  await updateProfile(user, {displayName: trimmed || null});
}

export async function uploadUserProfilePhoto(user: User, file: File): Promise<void> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (JPEG, PNG, or WebP).');
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    throw new Error('Photo must be 2 MB or smaller.');
  }
  const ext =
    file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `profiles/${user.uid}/avatar.${ext}`;
  const sref = ref(getFirebaseStorage(), path);
  await uploadBytes(sref, file, {contentType: file.type});
  const url = await getDownloadURL(sref);
  await updateProfile(user, {photoURL: url});
}

export async function clearUserProfilePhoto(user: User): Promise<void> {
  await updateProfile(user, {photoURL: null});
}

export async function changePasswordWithCurrent(
  user: User,
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const cred = EmailAuthProvider.credential(email.trim(), currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}

export async function sendPasswordResetToEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}

export function formatAuthError(e: unknown, context?: 'passwordChange'): string {
  if (e instanceof FirebaseError) {
    switch (e.code) {
      case 'auth/email-already-in-use':
        return 'That email is already registered. Try signing in.';
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/user-not-found':
        return 'Invalid email or password.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return context === 'passwordChange'
          ? 'Current password is incorrect.'
          : 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again later.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is disabled in Firebase. Enable Email/Password (and Google if needed) in the console.';
      case 'auth/requires-recent-login':
        return 'Sign out and sign in again, then try updating your password.';
      default:
        break;
    }
  }
  return e instanceof Error ? e.message : 'Something went wrong.';
}
