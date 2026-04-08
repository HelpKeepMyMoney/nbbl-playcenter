import {getFunctions, httpsCallable} from 'firebase/functions';
import {getFirebaseApp} from './firebase';

function functionsRegion(): string {
  return import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION?.trim() || 'us-central1';
}

function mapFunctionsError(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'code' in e && 'message' in e) {
    const code = String((e as {code: unknown}).code);
    const message = String((e as {message: unknown}).message);
    switch (code) {
      case 'functions/not-found':
        return 'Cloud Function is not deployed. Run firebase deploy --only functions (Blaze plan required).';
      case 'functions/failed-precondition':
      case 'failed-precondition':
        return message || 'Request not allowed.';
      case 'functions/permission-denied':
      case 'permission-denied':
        return message || 'Permission denied.';
      case 'functions/unauthenticated':
        return 'Sign in again and retry.';
      case 'functions/invalid-argument':
        return message || 'Invalid request.';
      default:
        return message || code;
    }
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

/**
 * Deletes the user’s clips (Storage + Firestore + likes), profile images, Firestore profile,
 * optional admins/{uid}, and the Firebase Authentication account. Requires deployed `deleteUserAccount` callable.
 */
export async function deleteUserAccountCallable(targetUid: string): Promise<{deletedClips: number}> {
  const fn = httpsCallable<{targetUid: string}, {ok: boolean; deletedClips?: number}>(
    getFunctions(getFirebaseApp(), functionsRegion()),
    'deleteUserAccount',
  );
  try {
    const res = await fn({targetUid});
    const data = res.data;
    return {deletedClips: typeof data?.deletedClips === 'number' ? data.deletedClips : 0};
  } catch (e) {
    throw new Error(mapFunctionsError(e));
  }
}

export type AdminRoleSetting = 'admin' | 'user';

/** Sets `admins/{uid}` and syncs Auth custom claim `admin` for Storage. Requires deployed `setUserAdminRole`. */
export async function setUserAdminRoleCallable(
  targetUid: string,
  role: AdminRoleSetting,
): Promise<void> {
  const fn = httpsCallable<{targetUid: string; role: AdminRoleSetting}, {ok?: boolean}>(
    getFunctions(getFirebaseApp(), functionsRegion()),
    'setUserAdminRole',
  );
  try {
    await fn({targetUid, role});
  } catch (e) {
    throw new Error(mapFunctionsError(e));
  }
}
