# NBBL PlayCenter

Mobile-first MVP for the [No Backboard Basketball League](https://nbbl.vercel.app/): a **basketball-focused recorder** (up to **60 seconds** per clip) plus a **content hub** to organize videos as **runs**, **highlights**, or **training**. Each signed-in user has a **private library** by default; clips can be **submitted for Community** after **moderator approval**.

- **Product story:** [nobackboard.com/playcenter](https://www.nobackboard.com/playcenter)  
- **Repository:** [github.com/HelpKeepMyMoney/nbbl-playcenter](https://github.com/HelpKeepMyMoney/nbbl-playcenter)

## Stack

| Layer | Technology |
| ----- | ---------- |
| App | [Vite](https://vitejs.dev/) 6, [React](https://react.dev/) 19, TypeScript |
| UI | [Tailwind CSS](https://tailwindcss.com/) 4, [Motion](https://motion.dev/), shadcn-style components in `components/ui/` |
| Auth & data | [Firebase](https://firebase.google.com/) Auth (**Google** + **email/password**), [Cloud Firestore](https://firebase.google.com/docs/firestore), [Cloud Storage](https://firebase.google.com/docs/storage) |
| Hosting | [Vercel](https://vercel.com/) (`vercel.json` SPA rewrite) |
| Deploy tooling | [Firebase CLI](https://firebase.google.com/docs/cli) via `firebase-tools` (dev dependency) |

## Features

### Core (library & recording)

- **Sign-in:** Google (popup) or **email/password** with **Sign in** / **Sign up** on the same screen; clips and files scoped to `request.auth.uid`
- **Branding:** NBBL mark from `public/logo.png` on the sign-in screen, hub header, and video player details (replace the file to update artwork everywhere it is referenced)
- `MediaRecorder` with **60s** hard limit, on-screen countdown, camera cleanup on close; on phones, **switch front/rear camera** before recording. **Uploaded `durationSec`** uses **wall-clock recording time** on stop (WebM metadata is often wrong/`Infinity` in browsers)
- Client-generated **JPEG thumbnails** uploaded with each video
- Hub: **My clips** vs **Community** (approved public clips), category filters, search (title + tags), loading and error states
- **Clip viewer (`VideoPlayer`):** **Newer / Older** navigation, **stats**, **Like** / **Share** / **Download**, **Delete clip** (owner only). Community clips hide delete for non-owners. Modal tuned for small viewports and safe-area
- **Hero banner** on the hub uses the same Unsplash basketball photo and gradient overlay as the NBBL marketing site (`.hero-gradient-nbbl` in `src/index.css`)
- **Mobile-first:** compact hero, fixed bottom **Hub | Record** bar, safe-area padding, large touch targets

### Profile (`ProfilePanel`)

- Open from the **avatar** in the hub header
- **Display name** (Firebase Auth `updateProfile`) + **Save name**; syncs **`ownerDisplayName`** on your clips for admin display
- **Profile photo:** upload to Storage `profiles/{uid}/…` or remove; updates Auth `photoURL`
- **Email/password accounts:** change password (re-auth) or send **password reset** email
- **Google-only:** password section hidden; name/photo still editable (Google-sourced until changed in app)
- Firestore **`users/{uid}`** is updated from Auth on sign-in and after profile changes (see [User profiles in Firestore](#user-profiles-in-firestore))

### Community & moderation

- **Request Community** (checkbox on save in `Recorder`, or in `VideoPlayer` for owners) sets clip status to **`pending`** — not visible in Community until approved
- **Community** tab lists only **`communityVisibility === published`** clips (newest first)
- **Moderators:** Firestore collection **`admins`** with **document ID = Firebase Auth UID** of each admin (document body can be `{}`). Those users see an **Admin** (shield) button in the hub
- **Admin panel:** filter **Pending / Live / Denied / Private / All**; **Approve** or **Deny** (denial **requires a reason** shown to the player). Loads **`users/{ownerUid}`** for display name + email when available. **Migrate legacy public** fixes old clips that used `isPublic` before the moderation model
- Owner sees **In review**, **Approved**, or **Denied** (with reason) banners on their clips
- **Storage:** clip files are readable by other signed-in users only when the clip is **published** (rules use Firestore `communityVisibility` via `firestore.get`, plus legacy `isPublic` fallback)

### Data model highlights

- **`clips`:** `userId`, `communityVisibility` (`private` \| `pending` \| `published` \| `rejected`), `moderationRejectionReason`, `moderatedAt`, `moderatedBy`, `ownerDisplayName`, media paths, metadata
- **`users`:** mirror of Auth profile + `createdAt` / `updatedAt` (see below)
- **`admins`:** presence of doc `admins/{uid}` grants admin UI + rule checks

## User profiles in Firestore

The app writes **`users/{uid}`** (same id as Firebase Auth) with:

- `displayName`, `email`, `photoURL` (nullable), `createdAt`, `updatedAt`

**Important:** A row appears when that account **signs in to the app** (or after you run the backfill script). Having two users under **Authentication** does not by itself create two `users` documents until each has signed in once or you backfill.

**One-time backfill** (service account JSON, Admin SDK):

```bash
npm install
# PowerShell:
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
npm run backfill:users
```

See `scripts/backfill-user-profiles.mjs` for details.

## Repository layout

| Path | Purpose |
| ---- | ------- |
| `src/App.tsx` | Auth, `users/{uid}` sync on auth state, my clips + Community subscriptions, recorder / profile / admin / player modals |
| `src/components/ContentHub.tsx` | My clips vs Community, filters, header (Record, Admin if applicable, avatar, sign out), bottom nav |
| `src/components/Recorder.tsx` | Camera, record, **Request Community** checkbox on save |
| `src/components/SignInScreen.tsx` | Email/password + Google; **awaits** `users/{uid}` upsert after successful sign-in/sign-up |
| `src/components/VideoPlayer.tsx` | Playback, owner **Community** checkbox + status banners, delete (owner), share/download |
| `src/components/VideoCard.tsx` | Thumbnail grid; **Live / Review / Denied** badges on My clips |
| `src/components/ProfilePanel.tsx` | Profile editing, password / reset, Firestore user doc + clip `ownerDisplayName` sync |
| `src/components/AdminPanel.tsx` | Moderation queue, approve/deny, owner profile fetch |
| `src/lib/firebase.ts` | App init from `VITE_FIREBASE_*` |
| `src/lib/auth.ts` | Auth, profile photo Storage upload, `updateProfile`, password helpers, `formatAuthError` |
| `src/lib/clips.ts` | Subscriptions, upload, delete, **setOwnerClipCommunityVisibility**, **moderateClipByAdmin**, legacy migration helper |
| `src/lib/userProfile.ts` | **`upsertUserProfileFromAuth`**, **`fetchUserProfilesByIds`** (admin) |
| `src/lib/admin.ts` | **`subscribeIsUserAdmin`** (`admins/{uid}` doc exists) |
| `src/lib/clipLikes.ts` | Per-clip likes in `localStorage` |
| `src/lib/thumbnail.ts` | Canvas thumbnail from recorded blob |
| `src/types.ts` | `VideoMetadata`, `CommunityVisibility`, `FeedScope`, helpers |
| `firestore.rules` | `users`, `admins`, `clips` (owner, community read for published, admin reads/updates) |
| `storage.rules` | `clips/{userId}/{clipId}/…` (owner or published clip), `profiles/{userId}/…` |
| `firestore.indexes.json` | `userId`+`createdAt`, `communityVisibility`+`createdAt` |
| `scripts/backfill-user-profiles.mjs` | Sync all Auth users → Firestore `users` (Admin SDK) |
| `firebase.json` | CLI targets for Firestore + Storage |
| `storage-cors.json` | GCS CORS for **Download** |
| `.firebaserc` | Default Firebase **project ID** |
| `public/logo.png` | League mark at `/logo.png` |

## Run locally

1. Install **Node.js** 20+.
2. `npm install`
3. In [Firebase Console](https://console.firebase.google.com/), create or select a project. Add a **Web** app and enable **Authentication →** **Google** and **Email/Password**, plus **Firestore** and **Storage**.  
   - If you see `auth/operation-not-allowed`, enable the matching sign-in method.
4. Copy `.env.example` to **`.env.local`** and set all `VITE_FIREBASE_*` variables (Project settings → Your apps → SDK config).
5. Deploy **Firestore rules + indexes** and **Storage rules** ([Firebase deploy](#firebase-deploy)).
6. **Storage CORS** for **Download:** apply `storage-cors.json` with `gsutil` (see below).
7. **Admins (optional):** In Firestore, create collection **`admins`**, add a document whose **ID** is the moderator’s Auth **UID** (empty map is fine).
8. `npm run dev` — default **http://localhost:3000**.

Never commit `.env.local` or `.env`.

### Storage CORS (Download)

```bash
gsutil cors set storage-cors.json gs://YOUR_STORAGE_BUCKET
```

## Firebase deploy

```bash
firebase login
firebase use your-project-id   # or rely on `.firebaserc`
```

| Command | What it deploys |
| ------- | ---------------- |
| `npm run deploy:firestore` | Firestore **rules** + **indexes** |
| `npm run deploy:storage` | Storage **rules** |
| `firebase deploy --only "firestore:rules,firestore:indexes,storage"` | All rules + indexes (quote the `--only` value on **PowerShell**) |

After rule or index changes, redeploy. New composite indexes may take a few minutes to build in the console.

## Deploy to Vercel

1. Push this repo to GitHub and import in [Vercel](https://vercel.com/) (framework: **Vite**, build `npm run build`, output `dist`).
2. Add **`VITE_FIREBASE_*`** for **Production** (and **Preview** if needed).
3. Firebase **Authentication → Authorized domains:** add your Vercel host.
4. Apply **Storage CORS** on the default bucket for production.

## npm scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Dev server (port 3000, all interfaces) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm run clean` | Delete `dist/` |
| `npm run deploy:firestore` | Deploy Firestore rules + indexes |
| `npm run deploy:storage` | Deploy Storage rules |
| `npm run backfill:users` | Admin SDK: copy all Auth users → `users` (needs `GOOGLE_APPLICATION_CREDENTIALS`) |

## Git and GitHub

```bash
git remote add origin https://github.com/HelpKeepMyMoney/nbbl-playcenter.git   # if not set
git add -A
git commit -m "Your message"
git push -u origin main
```

Use the branch your repo uses (`main` or `master`).
