# Architecture

Living document for how this application is structured. Update it when user-visible behavior or HTTP APIs change; see the Cursor project rule `.cursor/rules/architecture-doc.mdc`.

## Overview

Web app for building and exploring family trees on a **shared genealogy graph** (persons + relationships), with collaboration (trees as viewports, invites/claims, connection requests, merge, stewardship), and gamification (XP, achievements, quests, leaderboard). Next.js serves UI and Route Handlers; MySQL holds domain data via TypeORM; Redis and a separate mail worker handle outbound email.

For a **feature-oriented** map (domains, how they connect, UI ↔ API), see [`docs/TECHNICAL_FEATURES.md`](TECHNICAL_FEATURES.md). Shared-graph design: [`docs/GRAPH_GROWTH_DESIGN.md`](GRAPH_GROWTH_DESIGN.md). Update that file when you add or materially change user-visible capabilities or cross-entity flows, alongside this architecture file.

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js (App Router), React, TypeScript |
| UI | Tailwind CSS, [Radix Themes](https://www.radix-ui.com/themes) (`@radix-ui/themes` via root `Theme` in `src/app/providers.tsx`), plus Radix Primitives wrappers under `src/components/ui/` (incl. `AlertDialog`, `Alert`; date fields use shared `DatePicker`); shared primitives in `src/components/` |
| Data fetching (client) | TanStack Query (`src/lib/query-client.ts`, `src/components/query-provider.tsx`) |
| Database | MySQL via TypeORM (`src/config/db.ts`) |
| Auth | JWT in HTTP-only cookie (24h); `getAuthUser` / `requireAuth` in `src/lib/auth.ts`, tokens in `src/lib/jwt.ts`; `src/middleware.ts` redirects signed-in users away from `/auth/login` and `/auth/register` |
| Background work | BullMQ + Redis (`src/queue/`); mail delivery worker `scripts/mail-worker.ts` (`npm run worker:mail`) |
| Email | SMTP settings in `.env` (see `.env.example`); templates and sending in `src/api/services/mail/` |

## Repository map

| Path | Role |
|------|------|
| `src/app/(app)/` | Authenticated app pages (dashboard, trees, persons, gamification, etc.) |
| `src/app/auth/` | Login and register pages |
| `src/app/invite/` | Invite acceptance flow |
| `src/app/api/` | Next.js Route Handlers (HTTP API) |
| `src/api/entities/` | TypeORM entities (schema) |
| `src/api/migrations/` | TypeORM migrations (when used) |
| `src/api/services/` | Domain and integration services (users, mail, gamification, relationship inference) |
| `src/components/` | Reusable UI (tree viewer, gamification, navbar, motion helpers) |
| `src/config/` | App configuration (DB data source, site metadata, fonts, logos, logger) |
| `src/hooks/` | React hooks (e.g. `useAuth`) |
| `src/lib/` | Shared utilities (API client, errors, JWT, query keys, auth helpers) |
| `src/queue/` | Redis connection and mail queue |
| `src/stores/` | Client state (e.g. UI store) |
| `src/types/` | Shared TypeScript types |
| `scripts/` | Node/tsx scripts (mail worker) |
| `public/` | Static assets |

Engineering docs live in `docs/` at the repo root. Marketing-style in-app pages under `/docs` live in `src/app/(app)/docs/` and are not the same as this file.

## Runtime boundaries

- **Next.js middleware** (`src/middleware.ts`): edge auth gate for guest-only pages; verifies JWT cookie and redirects signed-in users from `/auth/login` and `/auth/register` to `/dashboard` (or a safe `?redirect=` path).
- **Next.js server** (Route Handlers, server components, server actions): safe place for DB (`initializeDataSource`, TypeORM), queue producers, and reading secrets from `process.env`.
- **Browser**: React client components; use `src/lib/api-fetch.ts` and TanStack Query for APIs; do not import MySQL/TypeORM into client bundles.
- **Mail worker**: separate process (`scripts/mail-worker.ts`); must run where Redis and SMTP are reachable. Outbound mail is not sent synchronously from every API path that enqueues work. Callers pass **body HTML only** to `sendMail`; `deliverMail` applies `baseTemplate` once (header + footer).

## API surface (index)

Detailed request/response contracts live in the Route Handler source files under `src/app/api/`. This table is an index of current routes (method semantics in code).

| Group | Routes |
|-------|--------|
| Health / misc | `GET`/`POST` `src/app/api/route.ts`; `src/app/api/mysql/students/route.ts` (MySQL sample/demo) |
| Auth | `src/app/api/auth/signin`, `signup`, `signout` |
| Users | `src/app/api/users`, `users/me`, `users/me/password`, `users/me/photo` (profile image upload) |
| Me (graph) | `src/app/api/me/relatives`, `me/suggestions`, `me/proposed-edits/incoming` |
| Trees | `src/app/api/trees`, `trees/[id]`, `trees/[id]/members` |
| Persons | `src/app/api/persons`, `persons/[id]`, `persons/suggestions`, `persons/merge/confirm`, `persons/[id]/proposed-edits` |
| Relationships | `src/app/api/relationships`, `relationships/[id]` (`DELETE ?personId=` direct unlink or 202 remove proposal) |
| Life events | `src/app/api/life-events`, `life-events/[id]` |
| Clans | `src/app/api/clans`, `clans/[id]` |
| Invites | `src/app/api/invites`, `invites/accept` (claim + auto-merge + relatives) |
| Connections | `src/app/api/connection-requests`, `connection-requests/[id]/respond` |
| Proposed edits | `src/app/api/proposed-edits/[id]/review` (field edits + `remove_relationship`) |
| Merge requests | `src/app/api/merge-requests`, `merge-requests/[id]`, `merge-requests/[id]/review` |
| Merge audits | `src/app/api/merge-audits`, `merge-audits/[id]/undo` |
| Gamification | `src/app/api/gamification/profile`, `activity`, `achievements`, `quests`, `leaderboard` |

## Data model

TypeORM entities under `src/api/entities/` map to MySQL tables. Core domain includes:

- **Identity / access:** `User`
- **Genealogy:** `Person` (incl. `visibility`), `Relationship`, `LifeEvent`, `FamilyTree`, `FamilyTreeMember`
- **Stewardship / growth:** `PersonSteward`, `ProposedEdit` (`kind`: field_edit | remove_relationship), `ConnectionRequest`, `MergeAudit`
- **Community / workflow:** `Clan`, `MergeRequest`, `FamilyInvite`
- **Gamification:** `UserXP`, `XPEvent`, `Achievement`, `UserAchievement`, `Quest`, `UserQuest`

Connection options and entity registration: `src/config/db.ts`. In non-production, `synchronize: true` aligns the schema from entities; production should rely on migrations or a controlled schema process before disabling synchronize.

## Cross-cutting concerns

- **HTTP errors and JSON shape:** `src/lib/ApiError.ts`, `src/lib/ApiResponse.ts`
- **Permissions / visibility:** `src/lib/permissions.ts` (`canEditPerson`, `canViewPerson`, `canUnlinkRelationship`, `canReviewRelationshipRemoval`, `canEditTree`, `canManageTree`, `getTreeMembership`); degree limit via `CONNECTIONS_VISIBILITY_DEGREE`. `canViewPerson`: `isPrivate` hard-hides except stewards/creator/linked/admin; otherwise `public` is open and `connections`/`stewards` are visible to graph relatives within the degree limit. Relationship `DELETE` requires `?personId=` context: direct remove if `canUnlinkRelationship` (admin, rel creator, linked/steward of context person); else creates a `ProposedEdit` `remove_relationship` (202). Tree membership writes (`POST`/`DELETE` `trees/[id]/members`) require `canEditTree` (owner, admin, or OWNER/EDITOR role). Tree settings/invites stay `canManageTree` (owner/admin). `GET /api/trees/[id]` returns `myRole`, `canEdit`, `canManage`.
- **Graph services:** `src/api/services/graph/relatives.service.ts`, `person.match.ts`, `merge.service.ts`
- **Logging:** `src/config/logger.ts`
- **Environment:** `.env` / `.env.example` — never commit secrets; document new variables here and in `.env.example` when they affect deployment or local setup. Steward backfill: `npm run backfill:stewards`.

## Change log (architecture)

Newest first.

- **2026-07-24** — Tree viewer: dagre hierarchical layout + couple-as-junction edges; skip redundant sibling links. Touched **Overview** (UI behavior).
- **2026-07-24** — Tree owner can rename via pencil on `/trees/[id]` (`PATCH /api/trees/[id]` limited to name/description/visibility). Touched **API surface**, **Overview**.
- **2026-07-24** — Trees list cards show small “Created by” owner name (`GET /api/trees` adds `createdBy`). Touched **API surface**, **Overview**.
- **2026-07-24** — `GET /api/merge-requests` enriches rows with `sourcePerson` / `targetPerson` (and tree names); merge list UIs show names with id fallback. Touched **API surface**, **Overview**.
- **2026-07-24** — Relationship unlink gated by `canUnlinkRelationship`; otherwise `DELETE` creates `ProposedEdit` `remove_relationship` (202) reviewed via `/proposals`. Touched **API surface**, **Data model**, **Cross-cutting**.
- **2026-07-24** — Destructive confirms use Radix `AlertDialog` (+ `Alert` callout) instead of `window.confirm` (relationship remove, admin merge review/undo). Touched **Tech stack**, **Overview**.
- **2026-07-24** — Avatar initials ignore quoted nicknames / punctuation (`Augustine … "Agusto"` → AO, not A"). Touched **Overview** (UI behavior).
- **2026-07-24** — Dashboard leads with “Needs your attention”; “Your people” sorted with immediate family first + kinship labels; then gamification/Explore. Touched **Overview** (UI behavior).
- **2026-07-24** — Signed-in users hitting `/auth/login` or `/auth/register` are redirected by `src/middleware.ts`; auth cookie `maxAge` aligned to JWT (24h). Touched **Tech stack**, **Runtime boundaries**.
- **2026-07-24** — Branded 404 UX: `src/app/not-found.tsx` + shared `NotFoundView` (also person/tree/clan missing states). Touched **Overview**.
- **2026-07-24** — Relationship-based visibility: graph relatives within degree limit can view `connections`/`stewards` people; `isPrivate` is the hard opt-out. Touched **Cross-cutting**; see `GRAPH_GROWTH_DESIGN.md`.
- **2026-07-24** — Tree GET shows all direct tree members to collaborators via `getRelatives` `alwaysVisibleIds`, bypassing per-person visibility for shared-tree members. Touched **API surface**.
- **2026-07-24** — People directory (`GET /api/persons`) filters by `canViewPerson`; person detail shows forbidden immediately (no retry on 403). Touched **API surface**, **Overview**.
- **2026-07-24** — Password fields use show/hide toggle (`PasswordInput`) on login, register, invite accept, and profile. Touched **Overview** (UI behavior).
- **2026-07-24** — Suggestions split: `relativesNearby` with inferred kinship labels (view-only) vs matches to Connect; no Connect for people already on the graph. Touched **API surface**.
- **2026-07-24** — All date fields use shared `DatePicker` (`src/components/ui/date-picker.tsx`): person create/edit birth & death, person detail marriage/union and life-event dates. Touched **Overview** (UI behavior).
- **2026-07-24** — Tree editors (invite EDITOR) can add/remove members; atomic `POST …/members` with `{ person }`; GET tree returns `canEdit` / `canManage`. Touched **API surface**, **Cross-cutting**.
- **2026-07-24** — `/connections` person-picker hub (suggestions + name search); `GET /api/connection-requests` returns `targetPerson` / `fromUser` / `fromPerson`. Touched **API surface**.
- **2026-07-24** — `GET /api/users/me` heals missing `linkedPersonId` from `Person.linkedUserId` and returns `linkedPerson` for profile Select prefill. Touched **API surface**.
- **2026-07-24** — `GET /api/trees?mine=1` returns owned trees and trees where the user is a `FamilyTreeMember` (invite join). Touched **API surface**.
- **2026-07-24** — Fixed double-wrapped invite/connection emails (duplicate MY UKOO header); document body-only → `sendMail` contract. Touched **Runtime boundaries**.
- **2026-07-24** — Shared graph growth: stewardship, visibility, claim-on-invite, auto-merge, proposed edits, connection requests, merge audits/undo. See `docs/GRAPH_GROWTH_DESIGN.md`. Touched **Overview**, **API surface**, **Data model**, **Cross-cutting**.
- **2026-07-24** — User profile photos: URL, local upload (`POST /api/users/me/photo` → `public/uploads/profiles/`), or [DiceBear Big Ears](https://www.dicebear.com/styles/big-ears) picker on `/profile`; navbar shows `UserAvatar`. Touched **API surface**, **Overview**.
- **2026-07-24** — Fixed person edit form: gender/status (and other selects) wait for API data before mounting so values prefill correctly. Touched **Overview** (UI behavior).
- **2026-07-24** — Adopted Radix Themes (`@radix-ui/themes`) with root `Theme` + `next-themes` class-based dark mode; CSS layered so Tailwind preflight does not override Themes styles. Touched **Tech stack**.
- **2026-04-21** — Linked `docs/TECHNICAL_FEATURES.md` from Overview (feature map companion doc); touched **Overview**.
- **2026-04-21** — Added initial `docs/ARCHITECTURE.md`, `.cursor/rules/architecture-doc.mdc` (`alwaysApply`), and a README link to this file.
