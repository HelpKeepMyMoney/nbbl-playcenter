# Participants module

## Firestore collection: `participants`

Enterprise fields on every document: `id`, `enterpriseId`, `tenantId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `status`, `version`, optional `deletedAt`.

### Domain fields

| Field | Type | Notes |
|-------|------|-------|
| `type` | string | `player`, `coach`, `parent`, `official`, `admin`, `staff` |
| `firstName`, `lastName` | string | Display + search |
| `email`, `phone` | string? | Contact |
| `organizationId` | string | FK to `organizations` |
| `dateOfBirth` | string? | ISO date |
| `tags` | string[] | Optional labels |

## Security

- **Read:** `participants:read` (tenant-scoped)
- **Write:** Callable functions only (`participants:write`)

## Callable functions

| Function | Input schema |
|----------|----------------|
| `createParticipant` | `createParticipantSchema` |
| `updateParticipant` | `updateParticipantSchema` |
| `softDeleteParticipant` | `{ id }` |

All writes append an `auditLogs` entry.

## UI routes

- `/participants` — searchable table, add/edit dialog, soft delete
