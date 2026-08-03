# NBBL PlayCenter

Basketball Experience Cloud (Platform One) — operational web application for the NBBL ecosystem.

## Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS, TanStack Query, Zustand, Firebase Web SDK
- **Backend:** Firebase Auth, Cloud Firestore, Cloud Functions, Storage (emulators for local development)
- **Shared:** `@nbbl/shared` (Zod schemas, RBAC, base document helpers)

Architecture aligns with [`public/NBBL Technology Infrastructure Strategy.pdf`](public/NBBL%20Technology%20Infrastructure%20Strategy.pdf).

## Prerequisites

- Node.js 20+
- npm 10+

## Local development (emulators)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment template (web app already includes `apps/web/.env.local` for emulators):

   ```bash
   cp .env.example apps/web/.env.local
   ```

3. Start Firebase emulators (terminal 1):

   ```bash
   npm run dev:emulators
   ```

4. Seed Firestore + Auth (terminal 2, after emulators are up):

   ```bash
   npm run seed
   npm run validate-seed -w functions
   ```

   This wipes prior tenant demo data and seeds **NBBL Circuit 1**: 64 NIL athletes (32 boys / 32 girls), 8 teams, Anthony Ray Recruiting Academy, NBBL Academy — PHX-01, full staff rosters, evaluations, events, and dashboard stats. Re-run `seed` anytime to reset the emulator dataset.

5. Start the web app (terminal 3):

   ```bash
   npm run dev:web
   ```

   Or run emulators + web together:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) and sign in:

   - **League Director:** `admin@nbbl.local` / `PlayCenter123!`
   - **Player:** `marcus.allen@nbbl.local` / `PlayCenter123!`
   - **Coach:** `anthony.ray@nbbl.local` / `PlayCenter123!`
   - **Fan:** `fan@nbbl.local` / `PlayCenter123!`

Emulator UI: [http://localhost:4000](http://localhost:4000)

## Modules in this milestone

- App shell (desktop sidebar + mobile tab bar) per UI references in `public/`
- **Participants** — list, create, edit, soft delete (callable Cloud Functions)
- **Teams** — filters, KPI cards, master/detail pane, roster management
- **Communications** — league director inbox with notifications and messages tabs; role-specific notification/message previews for player, coach, and fan (header dropdowns + dedicated inbox pages)

## Tests

```bash
npm test
```

## Production Firebase

Production project wiring is intentionally deferred. Set `NEXT_PUBLIC_USE_EMULATORS=false` and provide real Firebase web config when a GCP project is ready. Enable App Check before production cutover.

## Documentation

- [`docs/participants.md`](docs/participants.md)
- [`docs/teams.md`](docs/teams.md)
