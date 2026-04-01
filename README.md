# NBBL PlayCenter

Mobile-first MVP for the [No Backboard Basketball League](https://nbbl.vercel.app/): a **basketball-focused recorder** (up to **60 seconds** per clip) plus a **content hub** to organize videos as **runs**, **highlights**, or **training**. Each signed-in user has a **private library** (owner-only Firestore and Storage rules).

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

- **Sign-in:** Google (popup) or **email/password** with **Sign in** / **Sign up** on the same screen; clips and files scoped to `request.auth.uid`
- **Branding:** NBBL mark from `public/logo.png` on the sign-in screen, hub header, and video player details (replace the file to update artwork everywhere it is referenced)
- `MediaRecorder` with **60s** hard limit, on-screen countdown, camera cleanup on close; on phones, **switch front/rear camera** before recording (swap control on the live preview in `Recorder.tsx`). **Uploaded `durationSec`** uses **wall-clock recording time** on stop (WebM metadata is often wrong/`Infinity` in browsers—avoided so stats are not stuck at 1:00)
- Client-generated **JPEG thumbnails** uploaded with each video
- Hub: category filters, search (title + tags), loading and error states
- **Clip viewer (`VideoPlayer`):** **Newer / Older** navigation through your library (same order as the hub), **stats** from real metadata (duration, category, tag count, position in library), **Like** / **Share** / **Download**, **Delete clip** (removes Firestore doc + Storage video/thumbnail for that clip; clears local like). Modal uses **scroll + `max-h` / safe-area** so the full panel (including stats and delete) fits on small viewports and Vercel/mobile browsers
- **Hero banner** on the hub uses the same Unsplash basketball photo and gradient overlay as the NBBL marketing site hero (companion `nbbl` project `index.html`; `.hero-gradient-nbbl` in `src/index.css`)
- **Mobile-first:** compact hero, fixed bottom **Hub | Record** bar, safe-area padding, large touch targets

## Repository layout

| Path | Purpose |
| ---- | ------- |
| `src/App.tsx` | Auth gate, Firestore clip subscription; recorder + player modals; `handleDeleteClip` + **`useCallback` before any early return** (Rules of Hooks) |
| `src/components/ContentHub.tsx` | Library grid, filters, header, bottom nav |
| `src/components/Recorder.tsx` | Camera (`getUserMedia` with `facingMode`), front/rear toggle, record/stop; save uses **wall-clock** duration + safer blob metadata fallback |
| `src/components/SignInScreen.tsx` | Email/password (sign in & sign up), Google sign-in, or “configure Firebase” message |
| `src/components/VideoPlayer.tsx` | Clip modal: playback (capped video height), scrollable body, library nav, stats, like / share / download / **delete** (`getBlob` + `videoStoragePath`; bucket CORS for download) |
| `src/lib/firebase.ts` | App init from `VITE_FIREBASE_*` |
| `src/lib/auth.ts` | Google + email/password auth, `signOut`, `onAuthStateChanged`, `formatAuthError` |
| `src/lib/clips.ts` | `subscribeToMyClips`, `uploadClip`, **`deleteClip`** (Storage + Firestore); maps Firestore → `VideoMetadata` (incl. `durationSec`, `videoStoragePath`, `thumbnailStoragePath`) |
| `src/lib/clipLikes.ts` | Per-clip likes in `localStorage`; **`removeClipLike`** when a clip is deleted |
| `src/lib/thumbnail.ts` | Canvas thumbnail from recorded blob |
| `firestore.rules` / `storage.rules` | Owner-only security rules |
| `firestore.indexes.json` | Composite index: `userId` + `createdAt` desc |
| `firebase.json` | CLI targets for Firestore + Storage |
| `storage-cors.json` | GCS CORS rules — apply to your default bucket so **Download** works from the browser (localhost + production) |
| `.firebaserc` | Default Firebase **project ID** for CLI deploys |
| `public/logo.png` | League mark served at `/logo.png` for sign-in, hub, and player UI |
| `src/index.css` | Global styles; `.hero-gradient-nbbl` matches main NBBL site hero overlay |

## Run locally

1. Install **Node.js** 20+.
2. `npm install`
3. In [Firebase Console](https://console.firebase.google.com/), create a project (or use an existing one). Add a **Web** app and enable **Authentication →** **Google** and **Email/Password** (both under Sign-in method), plus **Firestore** and **Storage**.  
   - If you see `auth/operation-not-allowed`, the provider you tried is not enabled for this project—turn on the matching method and save.
4. Copy `.env.example` to **`.env.local`** and set all variables (from Project settings → Your apps → SDK config):

   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

5. Deploy **Firestore rules + indexes** and **Storage rules** (see [Firebase deploy](#firebase-deploy)). You can paste rules in the Console instead, but the CLI keeps the repo as the source of truth.
6. **Storage CORS (needed for Download):** Without CORS on your **default Storage bucket**, the browser blocks reading clip bytes from `localhost` or your deployed domain (`Access-Control-Allow-Origin`). Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (for `gsutil`), then apply the repo file (use the bucket name from `VITE_FIREBASE_STORAGE_BUCKET`, e.g. `your-project.appspot.com`):

   ```bash
   gsutil cors set storage-cors.json gs://YOUR_STORAGE_BUCKET
   ```

   The committed `storage-cors.json` allows **GET** from any origin (`*`) for simplicity; you can replace `*` with explicit origins (e.g. `http://localhost:3000`, `https://your-app.vercel.app`) for stricter control.

7. `npm run dev` — app defaults to **http://localhost:3000** (see `package.json`).

Never commit `.env.local` or `.env`; they are listed in `.gitignore`.

## Firebase deploy

Prerequisites: [install Firebase CLI](https://firebase.google.com/docs/cli) or use the local `firebase-tools` package via `npx` / npm scripts. Log in once:

```bash
firebase login
```

**Project selection:** `.firebaserc` sets the default project (e.g. `nbbl-playcenter`). To use another project:

```bash
firebase use your-project-id
# or edit .firebaserc
```

| Command | What it deploys |
| ------- | ---------------- |
| `npm run deploy:firestore` | Firestore **rules** + **indexes** (`firestore.rules`, `firestore.indexes.json`) |
| `npm run deploy:storage` | Storage **rules** (`storage.rules`) |
| `firebase deploy --only firestore:rules,firestore:indexes,storage` | Everything above in one command |

After changing rules or indexes, redeploy so production matches the repo.

**Storage CORS** (in-app **Download**) is applied with **`gsutil`**, not `firebase deploy` — see [Run locally](#run-locally) step 6.

## Deploy to Vercel

1. Push this repo to GitHub and import it in [Vercel](https://vercel.com/) (framework: **Vite**, build `npm run build`, output `dist`).
2. Add the same **`VITE_FIREBASE_*`** environment variables for **Production** (and **Preview** if you use preview deployments).
3. In Firebase **Authentication → Settings → Authorized domains**, add your Vercel domain (e.g. `your-app.vercel.app`).
4. Ensure **Storage CORS** is applied on your default bucket (`gsutil cors set storage-cors.json gs://…` — [Run locally](#run-locally) step 6) so **Download** works in production as well as on `localhost`.

## npm scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Dev server (port 3000, all interfaces) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm run clean` | Delete `dist/` (rimraf) |
| `npm run deploy:firestore` | Deploy Firestore rules + indexes |
| `npm run deploy:storage` | Deploy Storage rules |

## Git and GitHub

```bash
git remote add origin https://github.com/HelpKeepMyMoney/nbbl-playcenter.git   # if not set
git add -A
git commit -m "Your message"
git push -u origin main
```

Use the branch name your repo uses (`main` or `master`).
