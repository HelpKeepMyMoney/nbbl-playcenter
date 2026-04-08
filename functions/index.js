/**
 * Callable HTTPS function: full account removal (Auth + Firestore users + clips + Storage).
 * Caller must have a document at Firestore admins/{callerUid}.
 *
 * Deploy: firebase deploy --only functions (requires Blaze billing on the Firebase project).
 */
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {FieldValue, getFirestore} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {onCall, HttpsError} from 'firebase-functions/v2/https';

initializeApp();

const CLIP_PAGE = 40;

/**
 * @param {import('@google-cloud/storage').Bucket} bucket
 * @param {string} path
 */
async function deleteFileQuiet(bucket, path) {
  if (!path || typeof path !== 'string') return;
  try {
    await bucket.file(path).delete();
  } catch (e) {
    const code = e?.code;
    if (code === 404) return;
    console.warn('[deleteUserAccount] storage delete', path, e?.message || e);
  }
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {FirebaseFirestore.DocumentReference} clipRef
 */
async function deleteLikesSubcollection(db, clipRef) {
  const snap = await clipRef.collection('likes').get();
  if (snap.empty) return;
  let batch = db.batch();
  let n = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    n++;
    if (n >= 450) {
      await batch.commit();
      batch = db.batch();
      n = 0;
    }
  }
  if (n > 0) await batch.commit();
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {import('@google-cloud/storage').Bucket} bucket
 * @param {string} ownerUid
 * @param {string} clipId
 * @param {FirebaseFirestore.DocumentData} data
 */
async function deleteOneClip(db, bucket, ownerUid, clipId, data) {
  const prefix = `clips/${ownerUid}/`;
  const v = data.videoStoragePath;
  const t = data.thumbnailStoragePath;
  if (typeof v === 'string' && v.startsWith(prefix)) await deleteFileQuiet(bucket, v);
  if (typeof t === 'string' && t.startsWith(prefix)) await deleteFileQuiet(bucket, t);
  const clipRef = db.collection('clips').doc(clipId);
  await deleteLikesSubcollection(db, clipRef);
  await clipRef.delete();
}

/**
 * @param {import('@google-cloud/storage').Bucket} bucket
 * @param {string} uid
 */
async function deleteProfilePrefix(bucket, uid) {
  const prefix = `profiles/${uid}/`;
  const [files] = await bucket.getFiles({prefix});
  await Promise.all(files.map(f => f.delete().catch(() => {})));
}

export const deleteUserAccount = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '512MiB',
    cors: true,
  },
  async request => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const callerUid = request.auth.uid;
    const targetUid = request.data?.targetUid;
    if (typeof targetUid !== 'string' || !targetUid.trim()) {
      throw new HttpsError('invalid-argument', 'targetUid is required.');
    }
    const uid = targetUid.trim();
    if (uid === callerUid) {
      throw new HttpsError('failed-precondition', 'You cannot delete your own account with this tool.');
    }

    const db = getFirestore();
    const adminSnap = await db.collection('admins').doc(callerUid).get();
    if (!adminSnap.exists) {
      throw new HttpsError('permission-denied', 'Admin only.');
    }

    const bucket = getStorage().bucket();

    let lastDoc = null;
    let deletedClips = 0;
    while (true) {
      let q = db
        .collection('clips')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(CLIP_PAGE);
      if (lastDoc) q = q.startAfter(lastDoc);
      const snap = await q.get();
      if (snap.empty) break;
      for (const doc of snap.docs) {
        await deleteOneClip(db, bucket, uid, doc.id, doc.data());
        deletedClips++;
      }
      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.size < CLIP_PAGE) break;
    }

    await deleteProfilePrefix(bucket, uid);

    await db.collection('admins').doc(uid).delete().catch(() => {});

    try {
      await getAuth().deleteUser(uid);
    } catch (e) {
      const code = e?.errorInfo?.code || e?.code;
      if (code !== 'auth/user-not-found') {
        console.error('[deleteUserAccount] auth delete', uid, e);
        throw new HttpsError(
          'internal',
          e?.message || 'Removed clips but Firebase Auth delete failed. Check logs.',
        );
      }
    }

    await db.collection('users').doc(uid).delete().catch(() => {});

    return {ok: true, deletedClips};
  },
);

/**
 * Promote or demote a user: creates/deletes `admins/{uid}` and syncs Auth custom claim `admin`
 * (Storage rules accept either). Caller must be admin; cannot demote yourself.
 */
export const setUserAdminRole = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB',
    cors: true,
  },
  async request => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const callerUid = request.auth.uid;
    const targetUid = request.data?.targetUid;
    const role = request.data?.role;
    if (typeof targetUid !== 'string' || !targetUid.trim()) {
      throw new HttpsError('invalid-argument', 'targetUid is required.');
    }
    if (role !== 'admin' && role !== 'user') {
      throw new HttpsError('invalid-argument', 'role must be "admin" or "user".');
    }
    const uid = targetUid.trim();
    if (uid === callerUid && role === 'user') {
      throw new HttpsError('failed-precondition', 'You cannot remove your own admin role.');
    }

    const db = getFirestore();
    const adminSnap = await db.collection('admins').doc(callerUid).get();
    if (!adminSnap.exists) {
      throw new HttpsError('permission-denied', 'Admin only.');
    }

    const auth = getAuth();
    if (role === 'admin') {
      await db.collection('admins').doc(uid).set(
        {updatedAt: FieldValue.serverTimestamp()},
        {merge: true},
      );
      try {
        const userRecord = await auth.getUser(uid);
        const existing = userRecord.customClaims ?? {};
        await auth.setCustomUserClaims(uid, {...existing, admin: true});
      } catch (e) {
        const code = e?.errorInfo?.code || e?.code;
        if (code !== 'auth/user-not-found') {
          console.error('[setUserAdminRole] set claims', uid, e);
          throw new HttpsError('internal', e?.message || 'Firestore updated but Auth claims failed.');
        }
      }
    } else {
      await db.collection('admins').doc(uid).delete().catch(() => {});
      try {
        const userRecord = await auth.getUser(uid);
        const existing = userRecord.customClaims ?? {};
        const {admin: _drop, ...rest} = existing;
        await auth.setCustomUserClaims(uid, rest);
      } catch (e) {
        const code = e?.errorInfo?.code || e?.code;
        if (code !== 'auth/user-not-found') {
          console.error('[setUserAdminRole] clear claims', uid, e);
        }
      }
    }

    return {ok: true, role};
  },
);
