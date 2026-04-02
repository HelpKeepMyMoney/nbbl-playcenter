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
- **Recorder:** **Camera** (`MediaRecorder`, **60s** hard limit, countdown, front/rear switch) **or** **From camera roll** (`<input type="file" accept="video/*">`). After capture or pick, **trim** the clip with **start/end sliders** before save (still capped at 60s of output).
- **Upload processing (`src/lib/videoProcess.ts`):** Clips are re-encoded in the browser (video element + `captureStream` + `MediaRecorder`) so the uploaded file stays **≤ 20 MB** (bitrate is stepped down until the cap is met). A **fast path** skips re-encode for short **full-length** camera recordings that are already under the cap. **Uploaded `durationSec`** reflects the **trimmed** segment; camera wall-clock time is still used when metadata is unreliable. Re-encoding support **varies by browser** (test camera-roll uploads on target devices).
- Client-generated **JPEG thumbnails** uploaded with each video; Storage filenames use **`video.webm`** or **`video.mp4`** depending on the output blob type (`src/lib/clips.ts`).
- **Hub layout:** **Hero** first, then **My clips / Community**, then a **dismissible orange banner** when a **your** clip’s **community status** changes (e.g. submitted for review, approved, denied with reason, withdrawn). Banner auto-dismisses after ~12s. Below that: errors, **category filters + search**, then the grid.
- **Clip viewer (`VideoPlayer`):** **Newer / Older** navigation, **stats**, **Like** / **Share** / **Download**, **Delete clip** (owner only). Community clips hide delete for non-owners. **Playback is muted by default** (user can unmute with the native controls). Modal tuned for small viewports and safe-area
- **Hero banner** on the hub uses the same Unsplash basketball photo and gradient overlay as the NBBL marketing site (`.hero-gradient-nbbl` in `src/index.css`)
- **Mobile-first:** compact hero, fixed bottom **Hub | Record** bar, safe-area padding, large touch targets

### Profile (`ProfilePanel`)

- Open from the **avatar** in the hub header
- **Display name** (Firebase Auth `updateProfile`) + **City** (Firestore `users/{uid}.city`) + **Save**; name syncs **`ownerDisplayName`** on your clips for admin display
- **Profile photo:** upload to Storage `profiles/{uid}/…` or remove; updates Auth `photoURL`
- **Email/password accounts:** change password (re-auth) or send **password reset** email
- **Google-only:** password section hidden; name/photo still editable (Google-sourced until changed in app)
- Firestore **`users/{uid}`** is updated from Auth on sign-in and after profile changes (see [User profiles in Firestore](#user-profiles-in-firestore))

### Community & moderation

- **Request Community** (checkbox on save in `Recorder`, or in `VideoPlayer` for owners) sets clip status to **`pending`** — not visible in Community until approved
- **Community** tab lists only **`communityVisibility === published`** clips (newest first)
- **Moderators:** Firestore collection **`admins`** with **document ID = Firebase Auth UID** of each admin (document body can be `{}`). Those users see an **Admin** (shield) button in the hub. For **Storage** (`getDownloadURL` on pending/denied/private clips), rules also accept an Auth **custom claim** `admin: true` (set with `npm run admin:set-claim -- <uid>` — see script below). After setting or changing claims, **sign out and sign in** so the ID token includes them
- **Admin panel:** filter **Pending / Live / Denied / Private / All**; **Approve** or **Deny** (denial **requires a reason** shown to the player). Loads **`users/{ownerUid}`** for display name + email when available. **Migrate legacy public** fixes old clips that used `isPublic` before the moderation model
- Owner sees **In review**, **Approved**, or **Denied** (with reason) banners on their clips
- **Storage (clip objects):** readable when **you own the path** (`clips/{yourUid}/…`), when the clip is **published** in Firestore (rules use `firestore.get` on `clips/{clipId}` for `communityVisibility` / legacy `isPublic`), or when your account is an **admin** (`request.auth.token.admin == true` **or** `firestore.exists` on `admins/{uid}`) so moderators can load **pending**, **denied**, and **private** media in the admin panel

### Data model highlights

- **`clips`:** `userId`, `communityVisibility` (`private` \| `pending` \| `published` \| `rejected`), `moderationRejectionReason`, `moderatedAt`, `moderatedBy`, `ownerDisplayName`, **`likeCount`** (denormalized), media paths, metadata
- **`clips/{clipId}/likes/{userId}`:** per-user like documents (used by **Like** in the player)
- **`users`:** mirror of Auth profile + **`city`**, `createdAt` / `updatedAt` (see below)
- **`admins`:** presence of doc `admins/{uid}` grants admin UI + Firestore rule checks; Storage rules also honor optional Auth claim **`admin`** (see `scripts/set-admin-claim.mjs`)

## User profiles in Firestore

The app writes **`users/{uid}`** (same id as Firebase Auth) with:

- `displayName`, `email`, `photoURL` (nullable), **`city`** (optional string), `createdAt`, `updatedAt`

**Important:** A row appears when that account **signs in to the app** (or after you run the backfill script). Having two users under **Authentication** does not by itself create two `users` documents until each has signed in once or you backfill.

**One-time backfill** (service account JSON, Admin SDK):

```bash
npm install
# PowerShell:
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
npm run backfill:users
```

See `scripts/backfill-user-profiles.mjs` for details.

**Moderator Storage claim** (same credentials as backfill):

```bash
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
npm run admin:set-claim -- YOUR_AUTH_UID
# To remove: npm run admin:set-claim -- YOUR_AUTH_UID --remove
```

See `scripts/set-admin-claim.mjs` for details.

## Repository layout

| Path | Purpose |
| ---- | ------- |
| `src/App.tsx` | Auth, `users/{uid}` sync, my clips + Community subscriptions, **hub status banner** (visibility transitions), recorder / profile / admin / player modals |
| `src/components/ContentHub.tsx` | Hero, **My clips / Community** (below hero), status **banner**, filters + search, header + bottom nav |
| `src/components/Recorder.tsx` | Camera **or** file pick, **trim** sliders, transcode path, **Request Community** on save |
| `src/components/SignInScreen.tsx` | Email/password + Google; **awaits** `users/{uid}` upsert after successful sign-in/sign-up |
| `src/components/VideoPlayer.tsx` | **Muted** autoplay + controls, owner **Community** checkbox + status banners, **Firestore likes**, delete (owner), share/download |
| `src/components/VideoCard.tsx` | Thumbnail grid; **Live / Review / Denied** badges on My clips |
| `src/components/ProfilePanel.tsx` | Profile editing, password / reset, Firestore user doc + clip `ownerDisplayName` sync |
| `src/components/AdminPanel.tsx` | Moderation queue, approve/deny, owner profile fetch |
| `src/lib/firebase.ts` | App init from `VITE_FIREBASE_*` |
| `src/lib/auth.ts` | Auth, profile photo Storage upload, `updateProfile`, password helpers, `formatAuthError` |
| `src/lib/clips.ts` | Subscriptions, upload, delete, **setOwnerClipCommunityVisibility**, **moderateClipByAdmin**; **subscribeToClipsForModeration** refreshes **`getIdToken(true)`** before **`getDownloadURL`** so moderators’ JWTs match Storage rules |
| `src/lib/userProfile.ts` | **`upsertUserProfileFromAuth`**, **`fetchUserProfilesByIds`** (admin) |
| `src/lib/admin.ts` | **`subscribeIsUserAdmin`** (`admins/{uid}` doc exists) |
| `src/lib/clipLikes.ts` | **`subscribeClipLiked`**, **`toggleClipLikeFirestore`** — `clips/{id}/likes/{uid}` + `likeCount` |
| `src/lib/videoProcess.ts` | **≤20 MB** transcode, trim window, duration probe, `canSkipCameraTranscode` |
| `src/lib/thumbnail.ts` | Canvas thumbnail from recorded blob |
| `src/types.ts` | `VideoMetadata`, `CommunityVisibility`, `FeedScope`, helpers |
| `firestore.rules` | `users`, `admins`, `clips` (owner, community read for published, admin reads/updates) |
| `storage.rules` | `clips/…` read: **admin** first (`request.auth.token.admin` **or** `firestore.exists(admins/{uid})`), then owner, then published clip via `firestore.get`; `profiles/{userId}/…` |
| `firestore.indexes.json` | `userId`+`createdAt`, `communityVisibility`+`createdAt` |
| `scripts/backfill-user-profiles.mjs` | Sync all Auth users → Firestore `users` (Admin SDK) |
| `scripts/set-admin-claim.mjs` | Set/remove Auth custom claim `admin` for Storage moderation reads (Admin SDK) |
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
7. **Admins (optional):** In Firestore, create collection **`admins`**, add a document whose **ID** is the moderator’s Auth **UID** (empty map is fine). If the admin panel shows **`storage/unauthorized`** when opening **Pending**, deploy latest **`storage.rules`**, then run **`npm run admin:set-claim -- <that-uid>`** once (service account env same as backfill) and have that user **sign out and back in**. Ensure [cross-service Storage ↔ Firestore rules](https://firebase.google.com/docs/rules/manage-deploy#manage_permissions_for_cross-service) permissions are enabled (Firebase usually prompts on first deploy of rules that call `firestore.get` / `firestore.exists`).
8. `npm run dev` — default **http://localhost:3000**.

Never commit `.env.local` or `.env`. **Service account keys** (`*-firebase-adminsdk-*.json`) are listed in `.gitignore` — keep them **outside** the repo if you can; if you already committed one, run `git rm --cached <file>` and rotate the key in Google Cloud Console.

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

**Storage rules + Firestore:** In Storage rules, use **`firestore.exists()`** / **`firestore.get()`** to read Firestore (the standalone **`exists()`** helper is for Firestore rules only and will not compile correctly here).

**PowerShell:** To deploy Firestore rules and Storage rules in one command, quote the `--only` value, e.g. `firebase deploy --only "firestore:rules,storage"`.

## Deploy to Vercel

1. Push this repo to GitHub and import in [Vercel](https://vercel.com/) (framework: **Vite**, build `npm run build`, output `dist`).
2. Add **`VITE_FIREBASE_*`** for **Production** (and **Preview** if needed).
3. Firebase **Authentication → Authorized domains:** add your Vercel host.
4. Apply **Storage CORS** on the default bucket for production.

After a new Vercel deployment, ask testers to **refresh** (or reopen the tab) so the browser loads the latest JS bundle; an old tab can still run previous client code and surface confusing auth or permission errors against current Firebase rules.

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
| `npm run admin:set-claim -- <uid>` | Admin SDK: set Auth custom claim `admin: true` for Storage moderation (add `--remove` to drop) |

## Git and GitHub

```bash
git remote add origin https://github.com/HelpKeepMyMoney/nbbl-playcenter.git   # if not set
git add -A
git commit -m "Your message"
git push -u origin main
```

Use the branch your repo uses (`main` or `master`).
