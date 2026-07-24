# Shared graph growth design

Living reference for the shared genealogy graph model. Implementation follows the phased plan; update this file when phases land or contracts change.

## Model

Persons and Relationships form one global graph (no `treeId` on edges). A `FamilyTree` is a viewport: seed members + BFS expansion via `getRelatives`. Users claim nodes via invites (`linkedUserId` / `linkedPersonId` + `PersonSteward`). Duplicates collapse through `mergePersons` with `MergeAudit`. Visibility is per-person (`public` | `connections` | `stewards`): relatives within `CONNECTIONS_VISIBILITY_DEGREE` hops can view `connections` and `stewards` people; `isPrivate` is a hard opt-out (stewards/creator/linked/admin only). Non-stewards propose edits (`ProposedEdit`). Inbound discovery uses `ConnectionRequest` and `/api/me/suggestions`.

## Key services

| Service | Path | Role |
|---------|------|------|
| Relatives BFS | `src/api/services/graph/relatives.service.ts` | Traversal + optional visibility filter |
| Person match | `src/api/services/person.match.ts` | `scorePair`, `matchOne`, `matchSets` |
| Merge | `src/api/services/merge.service.ts` | Transactional merge + undo |
| Permissions | `src/lib/permissions.ts` | `canEditPerson`, `canViewPerson`, stewards |

## API surface (growth)

| Route | Purpose |
|-------|---------|
| `GET /api/me/relatives` | Graph around linked person |
| `GET /api/me/suggestions` | Matches (connectable) + `relativesNearby` (kinship labels) + `reachablePersonIds` |
| `GET /api/me/proposed-edits/incoming` | Steward review inbox |
| `POST /api/persons/merge/confirm` | Self-serve merge |
| `GET/POST /api/connection-requests` | Inbound/outbound connection requests |
| `POST /api/connection-requests/[id]/respond` | Accept/decline |
| `GET /api/persons/[id]/proposed-edits` | Proposals for a person |
| `POST /api/proposed-edits/[id]/review` | Approve/reject proposal |
| `GET /api/merge-audits` | Admin merge history |
| `POST /api/merge-audits/[id]/undo` | Undo a merge |

Invite accept (`POST /api/invites/accept`) claims the node, always creates membership, auto-merges deterministic duplicates, returns relatives + pending merges.

## UI

- Dashboard: Your people + Family graph (matches to Connect; nearby relatives view-only with kinship labels)
- `/connections`: relatives nearby (inferred kinship) vs people to connect (search + matches); direct relationship picker only
- `/proposals`
- Invite accept: relatives preview + `MergeReviewDialog`
- Person edit: steward vs propose banner + visibility
- Admin: Audits tab with undo

Kinship labels such as grandmother are **display-inferred** from `parent_child` paths (`src/lib/kinshipLabel.ts`); they are not stored `RelationshipType` values.

## Ops

```bash
npm run backfill:stewards
```

Env: `CONNECTIONS_VISIBILITY_DEGREE` (default 4).
