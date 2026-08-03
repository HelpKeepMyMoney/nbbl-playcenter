/**
 * Create/update Firestore `users/{uid}` for every Firebase Auth user (even if they never opened the app).
 *
 * Prerequisites:
 * 1. Download a service account key: Firebase Console → Project settings → Service accounts → Generate key.
 * 2. Run (PowerShell):
 *    $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
 *    node scripts/backfill-user-profiles.mjs
 *
 * Or one-time:
 *    npx cross-env GOOGLE_APPLICATION_CREDENTIALS=./sa.json node scripts/backfill-user-profiles.mjs
 */

import admin from 'firebase-admin';
import {readFileSync, existsSync} from 'node:fs';

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credPath || !existsSync(credPath)) {
  console.error(
    'Set GOOGLE_APPLICATION_CREDENTIALS to the path of your Firebase service account JSON file.',
  );
  process.exit(1);
}

const sa = JSON.parse(readFileSync(credPath, 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id,
  });
}

const auth = admin.auth();
const db = admin.firestore();
const {FieldValue} = admin.firestore;

let nextPageToken;
let total = 0;

do {
  const list = await auth.listUsers(500, nextPageToken);
  const batch = db.batch();

  for (const u of list.users) {
    const ref = db.collection('users').doc(u.uid);
    const snap = await ref.get();
    const payload = {
      displayName: u.displayName ?? '',
      email: u.email ?? '',
      photoURL: u.photoURL ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (!snap.exists) {
      payload.createdAt = FieldValue.serverTimestamp();
      payload.city = '';
    }
    batch.set(ref, payload, {merge: true});
  }

  await batch.commit();
  total += list.users.length;
  nextPageToken = list.pageToken;
} while (nextPageToken);

console.log(`Done. Synced ${total} Auth user(s) into Firestore collection "users".`);
