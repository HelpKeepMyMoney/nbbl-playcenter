/**
 * Set or clear Firebase Auth custom claim `admin: true` for Storage rules (and faster rule checks).
 * You still need `admins/{uid}` in Firestore for the in-app Admin UI and Firestore security rules.
 *
 * Prerequisites: service account JSON (same as backfill script).
 *   PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
 *
 * Usage:
 *   node scripts/set-admin-claim.mjs <uid>
 *   node scripts/set-admin-claim.mjs <uid> --remove
 *
 * After setting claims, the user must get a fresh ID token (sign out and sign in, or wait ~1 hour).
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

const uid = process.argv[2];
const remove = process.argv.includes('--remove');
if (!uid || uid.startsWith('-')) {
  console.error('Usage: node scripts/set-admin-claim.mjs <uid> [--remove]');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(credPath, 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id,
  });
}

const user = await admin.auth().getUser(uid);
const existing = user.customClaims ?? {};
/** setCustomUserClaims replaces the whole claims map — merge with existing keys. */
let next;
if (remove) {
  const {admin: _drop, ...rest} = existing;
  next = rest;
} else {
  next = {...existing, admin: true};
}
await admin.auth().setCustomUserClaims(uid, next);
console.log(
  remove
    ? `Removed admin claim for ${uid}. User should sign out and back in.`
    : `Set admin claim for ${uid}. User should sign out and back in so Storage sees the new token.`,
);
