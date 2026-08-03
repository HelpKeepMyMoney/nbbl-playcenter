# Teams module

## Firestore collections

### `teams`

Denormalized list fields for the Teams grid: `headCoachName`, `playerCount`, `organizationId`, `ageGroup`, `division`, `seasonId`, `status`, facility/BINode display fields, `seasonStats`.

### `memberships`

Links `participantId` ↔ `teamId` with `role` (`player`, `coach`, `manager`).

### `tenants/{tenantId}/stats/teams`

Maintained counters: `totalTeams`, `activeTeams`, `teamsThisSeason`, `totalCoaches`.

## Security

- **Read:** `teams:read`
- **Write:** Callable functions (`teams:write`)

## Callable functions

| Function | Purpose |
|----------|---------|
| `createTeam` | Create team + refresh stats |
| `updateTeam` | Update team + refresh stats |
| `assignCoach` | Set head coach |
| `addTeamMember` | Roster add + `playerCount` |
| `removeTeamMember` | Soft-delete membership + `playerCount` |

## UI routes

- `/teams?teamId=...` — filters, KPI cards, table + detail pane (Overview + Roster tabs)

Reference layout: `public/04_teams_desktop.png`.
