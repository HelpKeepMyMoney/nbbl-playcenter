# NBBL PlayCenter

Mobile-first MVP for the [No Backboard Basketball League](https://nbbl.vercel.app/): a **basketball-focused recorder** (up to **60 seconds** per clip) plus a **Content Hub** to organize videos as **runs**, **highlights**, or **training**. Each signed-in user has a **private library** (**My clips**) by default; clips can be submitted with **Add to Content Hub** and appear for everyone only after **moderator approval**.

- **Product story:** [nobackboard.com/playcenter](https://www.nobackboard.com/playcenter)  
- **Repository:** [github.com/HelpKeepMyMoney/nbbl-playcenter](https://github.com/HelpKeepMyMoney/nbbl-playcenter)

## Stack

| Layer | Technology |
| ----- | ---------- |
| App | [Vite](https://vitejs.dev/) 6, [React](https://react.dev/) 19, TypeScript |
| UI | [Tailwind CSS](https://tailwindcss.com/) 4, [Motion](https://motion.dev/), shadcn-style components in `components/ui/` |
| Auth & data | [Firebase](https://firebase.google.com/) Auth (**Google** + **email/password**), [Cloud Firestore](https://firebase.google.com/docs/firestore), [Cloud Storage](https://firebase.google.com/docs/storage), [Cloud Functions](https://firebase.google.com/docs/functions) (callable: account deletion + admin role) |
| Hosting | [Vercel](https://vercel.com/) (`vercel.json` SPA rewrite) |
| Deploy tooling | [Firebase CLI](https://firebase.google.com/docs/cli) via `firebase-tools` (dev dependency) |

## Features

### Changelog (April 2026)

- **Admin — Users tab & full account removal:** The admin panel has **Clips** and **Users** tabs. **Users** lists up to **500** Firestore **`users`** profiles (live subscription). Moderators can **edit** profile fields (Firestore mirror only; does not change Firebase Auth identity), **delete a single account** or **bulk delete**, and set **Role** (**User** / **Admin**) per row or in the edit panel. **Delete account** calls the callable **`deleteUserAccount`** (removes that user’s **Auth** user, **`users/{uid}`**, **`admins/{uid}`** if present, all **`clips`** they own with **Storage** video/thumbnail under `clips/{uid}/…`, **`likes`** subcollections on those clips, and **`profiles/{uid}/`** Storage prefix). **Role** changes call **`setUserAdminRole`** (writes **`admins/{uid}`** and syncs Auth custom claim **`admin`**). Both callables require the **Blaze** billing plan, deployment to **`us-central1`** (or set **`VITE_FIREBASE_FUNCTIONS_REGION`** in `.env.local` to match), and the caller must have **`admins/{callerUid}`**. Firestore rules allow **moderators** to **read** any **`admins/{id}`** document (so the UI can show who is an admin); **writes** to **`admins`** remain **server-only** via Admin SDK in the function. Deploy **`firestore.rules`** after that change. In-app help for the Users tab is behind the **“?”** control next to the search field.
- **Cloud Functions (`functions/`):** **`deleteUserAccount`** and **`setUserAdminRole`** are **callable** HTTPS functions (2nd gen, **`firebase-functions` v2**). Root **`npm run deploy:functions`** runs `firebase deploy --only functions`. On **PowerShell**, quote combined deploy targets, e.g. `firebase deploy --only "functions,firestore:rules"`. First-time deploy may require enabling **Cloud Build**, **Artifact Registry**, and related APIs; if the build fails on **Artifact Registry** permissions, grant the **Google Cloud Functions service agent** (**`service-PROJECT_NUMBER@gcf-admin-robot.iam.gserviceaccount.com`**) **Artifact Registry Reader** on the project (see [Cloud Functions troubleshooting](https://cloud.google.com/functions/docs/troubleshooting#build-service-account)). After deploy, you can run **`firebase functions:artifacts:setpolicy`** to add a container image cleanup policy in **`us-central1`**. **`admin:set-claim`** remains optional; **`setUserAdminRole`** merges the **`admin`** claim when promoting and removes it when demoting (users may need to **sign out and back in** for Storage to see the new token).
- **Admin panel layout (Users):** The Users tab **scrolls** inside the admin card so the **edit profile** form and **Save** actions stay reachable; the **Role** dropdown appears on each row and at the top of the edit form (you cannot remove your **own** admin role from this UI).
- **Allnet demo & branding:** Hub header and **sign-in** titles both use **NB** (white) / **BL** (red) / **ALLNET** (white) / **(Demo)** (yellow), with **Basketball remixed** under the sign-in title (same treatment as the hub header tagline). Theme accent is **logo red** (Tailwind `red-*`, `--primary` / `--ring` in `src/index.css`); **yellow** is used for key highlights (hero **inspire**, **own** on the **My Clips** hero line, **Admin** button, **Add to Content Hub** in the hero bullet list, `.selection-nbbl` for text selection). Placeholder thumbnail (`src/lib/thumbnail.ts`) renders **NB** / **BL** in white / red before “ PlayCenter”.
- **Hub footer (marketing-aligned):** **`ContentHub`** footer matches the [nbbl](https://nbbl.vercel.app/) marketing layout: four-column grid (brand + tagline, **Menu** links to on-site anchors on nbbl.vercel.app, **Join** with **Try the demo** `/` and **Join The Movement** → `#stay-in-touch`, **Connect** with **IG** → [instagram.com/nobackboards](https://www.instagram.com/nobackboards/) and **TK** → TikTok). Bottom bar: copyright + **DESIGNED FOR THE 1%**. Extra bottom padding on small screens clears the fixed **Hub | Record** bar.
- **Copy — Content Hub workflow:** User-facing **Request Community** is labeled **Add to Content Hub** (`Recorder`, `VideoPlayer`). Toast and banner strings in **`App.tsx`**, search/loading placeholders, and player copy use **Content Hub** instead of “Community” where users read them (Firestore field `communityVisibility` and `feedScope === 'community'` are unchanged in code).
- **Hub hero:** Lead sentence plus **bulleted features** for **My clips** and **Content Hub** (demo preview, 60s record/upload, private **My Clips** library, Add to Content Hub when saving or viewing, moderators approve before clips are added to the Content Hub).
- **Admin — delete any clip:** Users with `admins/{uid}` may **delete another user’s clip** (same client `deleteClip(ownerUid, clip)` path). **Firestore** allows admins to delete `clips/{id}` and `clips/{id}/likes/*`. **Storage** splits **`create`/`update`** (owner only) from **`delete`** (owner **or** admin) under `clips/{userId}/{clipId}/…`. **`VideoPlayer`** receives `viewerCanDeleteClip` (owner **or** admin) and shows **Delete clip (admin)** for non-owners. Deploy **`firestore.rules`** and **`storage.rules`** after changes.
- **Hub (`ContentHub`):** NBBL logo in **header** and **footer** brand block; those links open [nbbl.vercel.app](https://nbbl.vercel.app/) in a **new tab**. **Content Hub status red banner** stays until the user taps **×** (no auto-dismiss timer in `App.tsx`). The published feed tab is labeled **Content Hub** (`feedScope === 'community'` in code); hero badge shows **Content Hub** in that mode. Footer structure and CTAs are described in **Hub footer (marketing-aligned)** above.
- **Recorder / preview:** Blob URL on the trim preview is attached in **`useLayoutEffect`** (with rAF fallback if the ref is late). Each new capture or upload bumps **`previewGeneration`** so the preview `<video>` **remounts** with a fresh `key`. **`preload="metadata"`** and native **controls**. **`isLikelyVideoFile`** accepts some picks with empty or generic MIME when the extension looks like video. If the browser cannot decode (e.g. **HEVC / “High Efficiency”** from iPhone), the internal note may still use **`TRANSCODE_UNSUPPORTED_HINT`** or the shorter black-preview string; **`isUndecodableLibraryNote()`** recognizes both (plus **“re-encode in the browser”**). When **library passthrough** applies (library + **≤ 20 MB** + that note), the overlay shows **`PREVIEW_PASSTHROUGH_HEADLINE`** / **`PREVIEW_PASSTHROUGH_FOOTNOTE`** (emerald, reassuring) instead of the long amber “failure” text — audio-without-video / black preview is expected there. **Save** stays available for passthrough when duration **≤ 60s**; if metadata says **longer than 60s**, an **amber** warning appears and **Save is disabled** (`passthroughOverLength`). **Passthrough upload** sends the **original** file; thumbnail uses **`captureThumbnailFromVideoBlobOrPlaceholder`** (real frame when the browser can decode, else neutral artwork). Trim sliders are not used. Non-passthrough decode issues (e.g. library file **> 20 MB**) still show the original **amber** `previewDecodeNote`.
- **Trim / transcode (`videoProcess.ts`):** Trim re-encode still draws **scaled video** (max long edge **1280px**) with **`canvas.captureStream`** + **`drawImage`** each frame. When the browser supports it, **audio is preserved** by muxing **audio tracks** from **`HTMLVideoElement.captureStream`** (with the element **unmuted** so captured audio is not silent) together with the **canvas video track** in one **`MediaRecorder`** session, using **`pickRecorderMimeForAVStream()`** (e.g. `vp8,opus`). If composition or **`MediaRecorder.start`** fails, the code **falls back** to **video-only** WebM (same as before: **video-only** mimes are preferred when there is no audio track so Chrome does not fail the muxer). **`createMediaRecorder`** accepts optional **`audioBitsPerSecond`**. **`seekTo`** skips work when already at the target, and uses an **8s timeout** if **`seeked`** never fires (fixes hangs at trim start **0**). One **`drawImage`** before **`MediaRecorder.start()`** primes the canvas track. Waits for **non-zero dimensions** (with a **play** probe); **`TRANSCODE_UNSUPPORTED_HINT`** when decode never succeeds. **`requestData()`** before **`stop()`**. **Fast path** **`canSkipCameraTranscode`** (full-length in-app camera clip under **20 MB**) still uploads the original blob and **keeps audio** without re-encode. During transcode, the source video may **play audibly** briefly while audio is captured.
- **Storage rules (`storage.rules`):** Published-clip reads use **`firestore.get`** on **`clips/{clipId}`** with the same **`communityVisibility` / legacy `isPublic`** logic as Firestore (function **`clipPublished`**). The path segment **`{userId}`** is **not** required to match the doc’s **`userId`** field (objects only exist under the real prefix; requiring a doc/path match denied **Content Hub** reads when **`userId`** on the document was missing or wrong). **Deploy** with **`npm run deploy:storage`** after edits. If thumbnails still return **`storage/unauthorized`**, confirm rules are deployed and [cross-service Storage ↔ Firestore](https://firebase.google.com/docs/rules/manage-deploy#manage_permissions_for_cross-service) permissions are enabled.
- **Likes:** **`App`** keeps **`selectedVideo`** in sync with **`displayVideos`**; **`VideoPlayer`** uses **optimistic like count** after toggle.

### Core (library & recording)

- **Sign-in:** Google (popup) or **email/password** with **Sign in** / **Sign up** on the same screen; clips and files scoped to `request.auth.uid`. Title line matches the hub: **NBBL ALLNET (Demo)** (same colors as the header).
- **Branding:** NBBL mark from `public/logo.png` on the sign-in screen, hub **header** and **footer**, and video player details (replace the file to update artwork everywhere it is referenced). Hub header and footer brand logos link to the marketing site ([nbbl.vercel.app](https://nbbl.vercel.app/)) in a **new tab** (`target="_blank"`, `rel="noopener noreferrer"`).
- **Recorder:** **Camera** (`MediaRecorder`, **60s** hard limit, countdown, front/rear switch) **or** **From camera roll** (`<input type="file" accept="video/*">`). After capture or pick, **trim** the clip with **start/end sliders** before save (still capped at 60s of output), **except** for **library** picks the browser **cannot decode** (HEVC-style): then **Save** may **upload the original** under **20 MB** and **60s**; thumbnail is a real frame when decode allows, else neutral placeholder (see changelog). **Preview** uses `useLayoutEffect` for the blob URL, **`previewGeneration`** + **`key`** to remount per clip, **`preload="metadata"`**, and an optional **amber decode hint** when the preview never gets picture dimensions or hits a media **error**. Picks with **empty or generic MIME** types are accepted when the filename looks like a video (e.g. some Android exports). For best preview/trim everywhere, **iPhone:** use **Most compatible** / **H.264** in Camera or export from Photos.
- **Upload processing (`src/lib/videoProcess.ts`):** Clips are re-encoded in the browser so the uploaded file stays **≤ 20 MB** (bitrate is stepped down until the cap is met), **unless** the **Recorder** uses **HEVC/library passthrough** (original bytes uploaded when rules above are met). The trim path **plays** the source, draws **scaled** frames to a **canvas**, and records with **`MediaRecorder`**. **Audio** from the file is included when the browser can mux **canvas video** + **`video.captureStream()`** audio tracks; otherwise the output is **video-only** (silent) as a fallback. **Fast path** skips re-encode for qualifying **full-length** in-app **camera** clips (**audio preserved**). **`isUndecodableLibraryNote()`**, **`TRANSCODE_UNSUPPORTED_HINT`**, **`PREVIEW_PASSTHROUGH_HEADLINE`**, and **`PREVIEW_PASSTHROUGH_FOOTNOTE`** coordinate passthrough vs transcode and **Recorder** overlay copy.
- Client-generated **JPEG thumbnails** uploaded with each video: **`captureThumbnailFromVideoBlob`** from a seeked frame when the browser can decode; **`captureThumbnailFromVideoBlobOrPlaceholder`** on **library passthrough** tries a real frame first, then neutral **NBBL PlayCenter** artwork if decode/draw fails (same codec limit as preview). Storage filenames use **`video.webm`** or **`video.mp4`** depending on the output blob type (`src/lib/clips.ts`).
- **Hub layout:** **Hero** first, then **My clips** / **Content Hub** (published feed), then a **dismissible red banner** when **your** clip’s **Content Hub** status changes (e.g. submitted for review, approved, denied with reason, withdrawn). The banner **stays until the user dismisses** it (×). Below that: errors, **category filters + search**, then the grid.
- **Clip viewer (`VideoPlayer`):** **Newer / Older** navigation, **stats**, **Like** / **Share** / **Download**, **Delete clip** (owner **or** admin). Non-owners without admin do not see delete. **Like count** updates immediately after a successful toggle (**optimistic `likeCountDisplay`**) and stays aligned with Firestore when the hub list refreshes. **Playback is muted by default** (user can unmute with the native controls). Owner **Add to Content Hub** checkbox and Content Hub status banners. Modal tuned for small viewports and safe-area
- **Hero banner** on the hub uses the same Unsplash basketball photo and gradient overlay as the NBBL marketing site (`.hero-gradient-nbbl` in `src/index.css`)
- **Mobile-first:** compact hero, fixed bottom **Hub | Record** bar, safe-area padding, large touch targets

### Profile (`ProfilePanel`)

- Open from the **avatar** in the hub header
- **Display name** (Firebase Auth `updateProfile`) + **City** (Firestore `users/{uid}.city`) + **Save**; name syncs **`ownerDisplayName`** on your clips for admin display
- **Profile photo:** upload to Storage `profiles/{uid}/…` or remove; updates Auth `photoURL`
- **Email/password accounts:** change password (re-auth) or send **password reset** email
- **Google-only:** password section hidden; name/photo still editable (Google-sourced until changed in app)
- Firestore **`users/{uid}`** is updated from Auth on sign-in and after profile changes (see [User profiles in Firestore](#user-profiles-in-firestore))

### Content Hub & moderation

- **Add to Content Hub** (checkbox on save in `Recorder`, or in `VideoPlayer` for owners) sets clip status to **`pending`** — not visible in the **Content Hub** feed until approved
- **Content Hub** tab lists only **`communityVisibility === published`** clips (newest first)
- **Moderators:** Firestore collection **`admins`** with **document ID = Firebase Auth UID** of each admin (document body can be `{}`). Those users see a yellow **Admin** (shield) button in the hub. For **Storage** (`getDownloadURL` on pending/denied/private clips), rules also accept an Auth **custom claim** `admin: true` (set with `npm run admin:set-claim -- <uid>` — see script below). After setting or changing claims, **sign out and sign in** so the ID token includes them
- **Admin panel:** **Clips** tab — filter **Pending / Live / Denied / Private / All**; **Approve** or **Deny** (denial **requires a reason** shown to the player); **bulk approve** (including returning **denied** clips to **Live**), bulk deny, bulk delete. Loads **`users/{ownerUid}`** for display name + email when available. **Migrate legacy public** fixes old clips that used `isPublic` before the moderation model. Admins can **delete any clip** from the player (see changelog). **Users** tab — list/edit/delete profiles, **Role** (User/Admin), and **full account removal** via Cloud Functions (see changelog).
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
| `src/App.tsx` | Auth, `users/{uid}` sync, my clips + Content Hub feed subscriptions, **hub status banner** (dismiss-only, no timeout), **re-sync `selectedVideo` from `displayVideos`** when the list updates (e.g. `likeCount`), **`viewerCanDeleteClip`** (owner or admin), recorder / profile / admin / player modals |
| `src/components/ContentHub.tsx` | Hero (lead + **bullets** per tab; **own** yellow on **My Clips**), **My clips / Content Hub** feed toggle, status **banner**, filters + search, **Allnet / NBBL** header + **nbbl-style footer** (grid, menu, join, connect, legal line), yellow **Admin** button when applicable, bottom nav |
| `src/components/Recorder.tsx` | Camera **or** file pick, **trim** sliders, preview blob URL + **previewGeneration** + decode **note**, **library HEVC passthrough** (`isUndecodableLibraryNote`, **`libraryPassthroughEligible`**, **`passthroughOverLength`**, **`PREVIEW_PASSTHROUGH_*`** overlay), **`saveDisabled`**, transcode path, **Add to Content Hub** on save |
| `src/components/SignInScreen.tsx` | Email/password + Google; **NB/BL/ALLNET/(Demo)** title + **Basketball remixed**; **awaits** `users/{uid}` upsert after successful sign-in/sign-up |
| `src/components/VideoPlayer.tsx` | **Muted** autoplay + controls, owner **Add to Content Hub** checkbox + Content Hub status banners, **Firestore likes** (`subscribeClipLiked`, optimistic like count label), **delete** (owner **or** admin), share/download |
| `src/components/VideoCard.tsx` | Thumbnail grid; **Live / Review / Denied** badges on My clips |
| `src/components/ProfilePanel.tsx` | Profile editing, password / reset, Firestore user doc + clip `ownerDisplayName` sync |
| `src/components/AdminPanel.tsx` | Moderation queue (clips + bulk actions), **Users** / **Clips** tabs; embeds **`AdminUsersTab`** |
| `src/components/AdminUsersTab.tsx` | Admin **Users** list, search, bulk/single **delete account**, **Edit profile**, **Role** (row + form), **“?”** help |
| `src/lib/adminCallable.ts` | **`httpsCallable`** wrappers for **`deleteUserAccount`** and **`setUserAdminRole`** (region from **`VITE_FIREBASE_FUNCTIONS_REGION`** or **`us-central1`**) |
| `src/lib/firebase.ts` | App init from `VITE_FIREBASE_*` |
| `src/lib/auth.ts` | Auth, profile photo Storage upload, `updateProfile`, password helpers, `formatAuthError` |
| `src/lib/clips.ts` | Subscriptions, upload, delete, **setOwnerClipCommunityVisibility**, **moderateClipByAdmin**; **subscribeToClipsForModeration** refreshes **`getIdToken(true)`** before **`getDownloadURL`** so moderators’ JWTs match Storage rules |
| `src/lib/userProfile.ts` | **`upsertUserProfileFromAuth`**, **`fetchUserProfilesByIds`** (admin), **`subscribeToUsersForAdmin`**, **`adminUpdateUserProfileFirestore`** |
| `src/lib/admin.ts` | **`subscribeIsUserAdmin`**, **`subscribeToAdminUids`** (moderator list of admin UIDs) |
| `src/lib/clipLikes.ts` | **`subscribeClipLiked`**, **`toggleClipLikeFirestore`** — `clips/{id}/likes/{uid}` + `likeCount` |
| `src/lib/videoProcess.ts` | **≤20 MB** transcode, trim via **canvas video + optional `HTMLVideoElement.captureStream` audio** muxed into **MediaRecorder** (scaled canvas), fallback **silent** video-only, **`isUndecodableLibraryNote`**, **`PREVIEW_PASSTHROUGH_HEADLINE`** / **`PREVIEW_PASSTHROUGH_FOOTNOTE`**, **`pickRecorderMimeForAVStream`**, **robust `seekTo`**, **`TRANSCODE_UNSUPPORTED_HINT`**, `requestData` before `stop`, `canSkipCameraTranscode` |
| `src/lib/thumbnail.ts` | **`captureThumbnailFromVideoBlob`**, **`generatePlaceholderThumbnail`**, **`captureThumbnailFromVideoBlobOrPlaceholder`** (passthrough: real frame first) |
| `src/types.ts` | `VideoMetadata`, `CommunityVisibility`, `FeedScope`, helpers |
| `firestore.rules` | `users`, `admins` (moderators may **read** all `admins/*`; client **writes** disabled), `clips` (owner, published **Content Hub** read model, admin reads/updates; **admin** may delete clips and like subdocs) |
| `storage.rules` | `clips/…` read: **admin**, path owner, or **`clipPublished(clipId)`** via **`firestore.get`**; **write** split so **delete** may be **admin** or path owner (upload stays owner-only); `profiles/{userId}/…` |
| `firestore.indexes.json` | `userId`+`createdAt`, `communityVisibility`+`createdAt` |
| `scripts/backfill-user-profiles.mjs` | Sync all Auth users → Firestore `users` (Admin SDK) |
| `scripts/set-admin-claim.mjs` | Set/remove Auth custom claim `admin` for Storage moderation reads (Admin SDK) |
| `lib/supabase.js` | Optional **Supabase** client (`@supabase/supabase-js`); expects `SUPABASE_URL` / `SUPABASE_ANON_KEY` in the environment (see root **`test.js`**) |
| `test.js` | Optional Node script: loads **`dotenv`** and exercises Supabase (`node test.js`) — not part of the Vite app |
| `firebase.json` | CLI targets for Firestore, Storage, and **Functions** (`functions/`) |
| `functions/index.js` | Callable **`deleteUserAccount`**, **`setUserAdminRole`** (Admin SDK; region **`us-central1`**) |
| `functions/package.json` | Cloud Functions dependencies (`firebase-admin`, `firebase-functions`) |
| `storage-cors.json` | GCS CORS for **Download** |
| `.firebaserc` | Default Firebase **project ID** |
| `public/logo.png` | League mark at `/logo.png` |

## Run locally

1. Install **Node.js** 20+.
2. `npm install`
3. In [Firebase Console](https://console.firebase.google.com/), create or select a project. Add a **Web** app and enable **Authentication →** **Google** and **Email/Password**, plus **Firestore** and **Storage**.  
   - If you see `auth/operation-not-allowed`, enable the matching sign-in method.
4. Copy `.env.example` to **`.env.local`** and set all `VITE_FIREBASE_*` variables (Project settings → Your apps → SDK config). If you deploy Functions outside **`us-central1`**, set **`VITE_FIREBASE_FUNCTIONS_REGION`** to the same region.
5. Deploy **Firestore rules + indexes** and **Storage rules** ([Firebase deploy](#firebase-deploy)). For **admin account deletion and role changes**, install dependencies in **`functions/`** (`npm install`), enable **Blaze**, and deploy **Functions** (`npm run deploy:functions` or `firebase deploy --only functions`).
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
| `npm run deploy:functions` | Cloud **Functions** only (`functions/`; **Blaze** required) |
| `firebase deploy --only "firestore:rules,firestore:indexes,storage"` | All rules + indexes (quote the `--only` value on **PowerShell**) |
| `firebase deploy --only "functions,firestore:rules"` | Functions + Firestore rules (e.g. after **`admins`** read-rule changes); quote on **PowerShell** |

After rule or index changes, redeploy. New composite indexes may take a few minutes to build in the console.

**Functions:** Run **`npm install`** inside **`functions/`** before the first deploy. If deploy fails on **Artifact Registry** access, fix **IAM** for the **Cloud Functions service agent** (see changelog above) and retry. Optional: **`firebase functions:artifacts:setpolicy`** to configure image cleanup in **`us-central1`**.

**Storage rules + Firestore:** In Storage rules, use **`firestore.exists()`** / **`firestore.get()`** to read Firestore (the standalone **`exists()`** helper is for Firestore rules only and will not compile correctly here).

**PowerShell:** To deploy Firestore rules and Storage rules in one command, quote the `--only` value, e.g. `firebase deploy --only "firestore:rules,storage"`.

## Deploy to Vercel

1. Push this repo to GitHub and import in [Vercel](https://vercel.com/) (framework: **Vite**, build `npm run build`, output `dist`).
2. Add **`VITE_FIREBASE_*`** for **Production** (and **Preview** if needed).
3. Firebase **Authentication → Authorized domains:** add your Vercel host.
4. Apply **Storage CORS** on the default bucket for production.

The **`.vercel`** directory (CLI link metadata) is **gitignored** so it is not committed.

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
| `npm run deploy:functions` | Deploy Cloud Functions (`firebase deploy --only functions`; **Blaze** plan) |
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
