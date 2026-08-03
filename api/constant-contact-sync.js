/**
 * Vercel serverless: opt-in marketing contacts → Constant Contact (same API as NBBL `api/contact.js`).
 * Env (set in Vercel, or root `.env` for `vercel dev`): CONSTANT_CONTACT_* + FIREBASE_SERVICE_ACCOUNT_KEY.
 */
import admin from 'firebase-admin';
import {FieldValue} from 'firebase-admin/firestore';

const CC_TOKEN_URL = 'https://authz.constantcontact.com/oauth2/default/v1/token';
const CC_SIGN_UP_URL = 'https://api.cc.email/v3/contacts/sign_up_form';

/** @type {{ accessToken: string | null; expiresAtMs: number }} */
let ccTokenCache = {accessToken: null, expiresAtMs: 0};

function ccStr(v) {
  if (v == null) return '';
  return String(v).trim();
}

function parseListIds() {
  const raw =
    ccStr(process.env.CONSTANT_CONTACT_LIST_IDS) || ccStr(process.env.CONSTANT_CONTACT_LIST_ID);
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function isCcConfigured() {
  return Boolean(
    ccStr(process.env.CONSTANT_CONTACT_CLIENT_ID) &&
      ccStr(process.env.CONSTANT_CONTACT_CLIENT_SECRET) &&
      ccStr(process.env.CONSTANT_CONTACT_REFRESH_TOKEN) &&
      parseListIds().length > 0,
  );
}

function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw?.trim()) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY');
  }
  const cred = JSON.parse(raw.trim());
  admin.initializeApp({credential: admin.credential.cert(cred)});
  return admin.app();
}

function splitDisplayName(name) {
  const t = String(name || '').trim();
  if (!t) return {first_name: '', last_name: ''};
  const i = t.indexOf(' ');
  if (i === -1) return {first_name: t.slice(0, 50), last_name: ''};
  return {
    first_name: t.slice(0, i).slice(0, 50),
    last_name: t.slice(i + 1).trim().slice(0, 50),
  };
}

async function getConstantContactAccessToken(clientId, clientSecret, refreshToken) {
  const now = Date.now();
  if (ccTokenCache.accessToken && now < ccTokenCache.expiresAtMs - 60_000) {
    return ccTokenCache.accessToken;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
  const bodyBasic = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const bodyForm = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  let tokenRes = await fetch(CC_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${basic}`,
    },
    body: bodyBasic.toString(),
  });

  let tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    tokenRes = await fetch(CC_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: bodyForm.toString(),
    });
    tokenJson = await tokenRes.json().catch(() => ({}));
  }
  if (!tokenRes.ok) {
    const msg =
      (tokenJson && (tokenJson.error_description || tokenJson.error)) ||
      `Token request failed (${tokenRes.status})`;
    throw new Error(msg);
  }
  const accessToken = tokenJson.access_token;
  const expiresInSec = Number(tokenJson.expires_in) || 7200;
  if (!accessToken) {
    throw new Error('Constant Contact token response missing access_token.');
  }
  ccTokenCache = {
    accessToken,
    expiresAtMs: now + expiresInSec * 1000,
  };
  return accessToken;
}

async function readJsonBody(req) {
  if (req.body != null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  if (!isCcConfigured()) {
    console.warn('[constant-contact-sync] Constant Contact env incomplete');
    return res.status(503).json({error: 'Constant Contact is not configured on the server.'});
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({error: 'Invalid JSON body.'});
  }

  const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
  if (!idToken) {
    return res.status(400).json({error: 'idToken is required.'});
  }

  let app;
  try {
    app = getAdminApp();
  } catch (e) {
    console.error('[constant-contact-sync]', e?.message || e);
    return res.status(503).json({error: 'Server is missing Firebase Admin credentials.'});
  }

  let decoded;
  try {
    decoded = await admin.auth(app).verifyIdToken(idToken);
  } catch (e) {
    return res.status(401).json({error: 'Invalid or expired id token.'});
  }

  const uid = decoded.uid;
  const userRef = admin.firestore(app).collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists || snap.data()?.marketingConsent !== true) {
    return res.status(403).json({error: 'Marketing consent is not enabled for this account.'});
  }

  const data = snap.data();
  const email = typeof data?.email === 'string' ? data.email.trim() : '';
  if (!email || !email.includes('@')) {
    return res.status(400).json({error: 'Profile email missing or invalid.'});
  }

  const clientId = ccStr(process.env.CONSTANT_CONTACT_CLIENT_ID);
  const clientSecret = ccStr(process.env.CONSTANT_CONTACT_CLIENT_SECRET);
  const refreshToken = ccStr(process.env.CONSTANT_CONTACT_REFRESH_TOKEN);
  const listMemberships = parseListIds();

  const displayName = typeof data?.displayName === 'string' ? data.displayName.trim() : '';

  try {
    const accessToken = await getConstantContactAccessToken(clientId, clientSecret, refreshToken);
    const {first_name, last_name} = splitDisplayName(displayName);
    const payload = {
      email_address: email,
      list_memberships: listMemberships,
      ...(first_name ? {first_name} : {}),
      ...(last_name ? {last_name} : {}),
    };

    const ccRes = await fetch(CC_SIGN_UP_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const ccJson = await ccRes.json().catch(() => ({}));
    if (!ccRes.ok) {
      const msg =
        (Array.isArray(ccJson.errors) &&
          ccJson.errors[0] &&
          (ccJson.errors[0].error_message || ccJson.errors[0].error_key)) ||
        ccJson.detail ||
        ccJson.title ||
        `Constant Contact sign_up_form failed (${ccRes.status})`;
      throw new Error(msg);
    }

    const contactId =
      (typeof ccJson.contact_id === 'string' && ccJson.contact_id) ||
      (ccJson.contact && typeof ccJson.contact.contact_id === 'string' && ccJson.contact.contact_id) ||
      null;

    const okPatch = {
      constantContactSyncedAt: FieldValue.serverTimestamp(),
      constantContactSyncError: FieldValue.delete(),
    };
    if (contactId) okPatch.constantContactContactId = contactId;
    await userRef.update(okPatch);

    return res.status(200).json({ok: true});
  } catch (e) {
    const errMsg = e?.message || String(e);
    console.error('[constant-contact-sync]', uid, errMsg);
    try {
      await userRef.update({
        constantContactSyncError: errMsg.slice(0, 500),
        constantContactSyncedAt: FieldValue.serverTimestamp(),
      });
    } catch (writeErr) {
      console.warn('[constant-contact-sync] failed to persist error on user doc', writeErr);
    }
    return res.status(500).json({error: errMsg.slice(0, 200)});
  }
}
