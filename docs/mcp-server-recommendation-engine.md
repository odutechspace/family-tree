# MCP Server for the Ukoo Family Tree Recommendation Engine

## Table of Contents

1. [Overview](#1-overview)
2. [What Is an MCP Server?](#2-what-is-an-mcp-server)
3. [Why an MCP Server for Recommendations?](#3-why-an-mcp-server-for-recommendations)
4. [Recommendation Use Cases](#4-recommendation-use-cases)
5. [Data Model Reference](#5-data-model-reference)
6. [Architecture](#6-architecture)
7. [MCP Primitives in Detail](#7-mcp-primitives-in-detail)
   - 7.1 [Resources](#71-resources)
   - 7.2 [Tools](#72-tools)
   - 7.3 [Prompts](#73-prompts)
8. [Tool Catalogue](#8-tool-catalogue)
9. [Implementation Guide](#9-implementation-guide)
   - 9.1 [Project Scaffold](#91-project-scaffold)
   - 9.2 [Database Connection](#92-database-connection)
   - 9.3 [Registering a Tool](#93-registering-a-tool)
   - 9.4 [Transport Options](#94-transport-options)
10. [Integration with Ukoo](#10-integration-with-ukoo)
11. [Scoring and Ranking Logic](#11-scoring-and-ranking-logic)
12. [Security Considerations](#12-security-considerations)
13. [Testing Strategy](#13-testing-strategy)
14. [Extending the Engine](#14-extending-the-engine)

---

## 1. Overview

Ukoo is a Next.js + MySQL (TypeORM) application for building African-heritage family trees. It models culturally specific relationship types (polygamy, co-wife, levirate, lobola), clans with totems and praise poems, oral histories, life events, and merge requests that join separate trees or duplicate person profiles.

A **recommendation engine** built as an MCP server would sit alongside Ukoo's existing REST API and give an AI assistant — embedded in the product or used by an operator — access to structured recommendation tools. The assistant can then surface intelligent suggestions to users: missing profile information, potential duplicate ancestors, trees from other families that share a clan/totem, next gamification quests, and more.

---

## 2. What Is an MCP Server?

The **Model Context Protocol (MCP)** is an open standard (introduced by Anthropic in 2024) that defines a wire protocol between an AI host (e.g., Claude Desktop, a custom chat interface, Cursor) and an external server that exposes data and functionality.

An MCP server publishes three kinds of primitives:

| Primitive | Purpose | Analogous to |
|-----------|---------|--------------|
| **Resource** | Structured read-only data that the LLM can load into context | REST `GET` endpoint |
| **Tool** | A callable function the LLM invokes with typed arguments | REST `POST` endpoint / RPC |
| **Prompt** | A reusable prompt template with injected parameters | Prompt library |

Communication uses JSON-RPC 2.0 over either `stdio` (for local/CLI use) or Server-Sent Events over HTTP (for networked deployments).

---

## 3. Why an MCP Server for Recommendations?

A conventional REST recommendation endpoint returns a static list of suggestions at request time. An MCP server goes further:

- **AI-native**: The LLM reasons over the returned data before presenting it, so suggestions become conversational explanations ("Your great-grandmother Amina appears in two trees — they may be the same person because they share the same clan totem *Shumba* and birth year 1932").
- **Composable**: Tools can be chained — the LLM calls `find_potential_duplicates`, then `get_person_details` on each result, then `suggest_merge_request`, all in a single user turn.
- **Context-aware**: Prompts and resources inject the current user's tree, XP profile, and cultural preferences so every suggestion is personalised.
- **Incremental**: New recommendation types can be added as new tools without touching the Next.js frontend.

---

## 4. Recommendation Use Cases

The following recommendation types are grounded in Ukoo's existing data model.

### 4.1 Profile Completeness

For every `Person` in a tree, measure which optional fields are still `null` and recommend what to add next. High-value missing fields:

- `birthDate` / `birthPlace`
- `biography` or `oralHistory`
- `photoUrl`
- `clanId` / `totem` / `tribeEthnicity`
- `originVillage` / `originCountry`

**Value**: Drives the gamification loop — filling gaps unlocks XP events and `HISTORIAN` achievements.

### 4.2 Potential Duplicate Persons

Two `Person` rows may represent the same real ancestor if they share:

- Matching or phonetically similar `firstName` + `lastName`
- Overlapping `birthDate` range (±2 years)
- Same `clanId` or `totem`
- Both appear in trees owned by different users but linked via a shared `Relationship` chain

**Value**: Triggers a `MergeRequest` of type `DUPLICATE_PERSON`.

### 4.3 Cross-Tree Family Connections

Two `FamilyTree` objects may belong to the same extended family when:

- A person in tree A shares `clanId` with a person in tree B
- A person in tree A has the same `lastName` + `originCountry` as a person in tree B
- A person in tree A is a known `CO_WIFE` or `LEVIRATE` partner of a person also present in tree B

**Value**: Triggers a `MergeRequest` of type `FAMILY_TREES` with a `connectingPersonId`.

### 4.4 Missing Relationships

Graph analysis of the relationship graph can detect structural gaps:

- A `Person` with no `PARENT_CHILD` relationship (no parents recorded)
- A `Person` with no `SIBLING` or `HALF_SIBLING` links despite historical context suggesting siblings
- A married person with no recorded spouse (no `SPOUSE` / `PARTNER` row)

**Value**: Prompts the user to research and fill in missing edges, increasing tree depth.

### 4.5 Clan Network Discovery

Given a user's clan (`clanId`), surface other public trees where persons share the same `totem` or `ethnicGroup`. This is especially powerful for diaspora users tracing roots.

**Value**: Facilitates organic tree merges and social connection between families.

### 4.6 Gamification Next-Step Quests

Using the `UserXP`, `UserQuest`, and `Quest` entities, recommend the single most impactful next action to maximise XP gain:

- Which incomplete `ONBOARDING` quest is blocking an achievement unlock?
- Which `DAILY` quest expires soonest?
- Which `DISCOVERY` quest is closest to completion?

**Value**: Keeps users engaged through a personalised action queue.

### 4.7 Life-Event Timeline Gaps

Compare a person's `LifeEvent` records against culturally expected milestones for their region/ethnicity. For example, if a person has a `TRADITIONAL_MARRIAGE` event but no `LOBOLA` event, or has a `BIRTH` but no `NAMING_CEREMONY`, the engine can flag these gaps.

**Value**: Encourages richer documentation of cultural practices.

### 4.8 Verification Backlog

Flag `Person` or `Relationship` rows where `isVerified = false` and there is enough corroborating evidence (cross-referencing two or more contributors) to warrant a verification prompt.

**Value**: Improves data quality and unlocks `CONNECTOR` achievements.

---

## 5. Data Model Reference

The following Ukoo entities are directly relevant to the recommendation engine.

| Entity | Key Fields Used |
|--------|----------------|
| `Person` | `id`, `firstName`, `lastName`, `birthDate`, `clanId`, `totem`, `tribeEthnicity`, `originCountry`, `linkedUserId`, `isVerified`, `isPrivate`, `biography`, `oralHistory`, `photoUrl` |
| `Relationship` | `personAId`, `personBId`, `type` (`RelationshipType`), `status`, `unionOrder` |
| `FamilyTree` | `id`, `ownerUserId`, `visibility`, `rootPersonId` |
| `FamilyTreeMember` | `treeId`, `personId`, `userId`, `role`, `isRootPerson` |
| `Clan` | `id`, `name`, `totem`, `originCountry`, `ethnicGroup` |
| `LifeEvent` | `personId`, `type` (`LifeEventType`), `eventDate`, `location`, `country` |
| `MergeRequest` | `type`, `status`, `sourcePersonId`, `targetPersonId`, `sourceTreeId`, `targetTreeId`, `connectingPersonId` |
| `UserXP` | XP counters tracked per user |
| `UserQuest` | Per-user quest progress |
| `Quest` | `type` (`QuestType`), `trackedEvent`, `targetCount` |
| `Achievement` | `category` (`AchievementCategory`), `progressTarget`, `progressField` |

Relationship types of particular importance for graph reasoning:

```
PARENT_CHILD | SPOUSE | PARTNER | SIBLING | HALF_SIBLING
STEP_PARENT  | ADOPTED | GUARDIAN | CO_WIFE | LEVIRATE
```

Life event types that indicate cultural completeness:

```
NAMING_CEREMONY | INITIATION | LOBOLA | BRIDEWEALTH
TRADITIONAL_MARRIAGE | MIGRATION | MEMORIAL | BURIAL
```

---

## 6. Architecture

```
┌──────────────────────────────────────────┐
│              Ukoo Next.js App             │
│                                          │
│  ┌──────────────┐   ┌─────────────────┐  │
│  │  AI Chat UI  │   │  REST API (app) │  │
│  │  (in-product)│   │  /api/trees/…   │  │
│  └──────┬───────┘   └────────┬────────┘  │
│         │ MCP Client          │ TypeORM   │
└─────────┼─────────────────────┼───────────┘
          │ JSON-RPC / SSE       │
          ▼                      ▼
┌─────────────────────┐   ┌──────────────┐
│  MCP Recommendation │   │  MySQL DB    │
│       Server        │◄──│  (shared)    │
│                     │   └──────────────┘
│  Resources          │
│  Tools              │
│  Prompts            │
└─────────────────────┘
          │
          ▼
   LLM (Claude / GPT)
   Reasons over tool
   results and produces
   natural-language
   recommendations
```

The MCP server is a **standalone Node.js / TypeScript process** that connects to the same MySQL database as the Next.js app. It does **not** replace the existing REST API; it runs in parallel and is invoked only when an AI assistant needs to compute or surface recommendations.

The MCP client lives either:

- **Inside Ukoo's Next.js app** — an API route (`/api/ai/recommendations`) calls the MCP server via the `@modelcontextprotocol/sdk` client over HTTP/SSE.
- **In an operator tool** — Cursor, Claude Desktop, or a custom chat interface connects directly.

---

## 7. MCP Primitives in Detail

### 7.1 Resources

Resources are read-only data snapshots injected into the LLM's context window. Define one resource per aggregate that the LLM needs as background before calling tools.

| Resource URI | Description |
|---|---|
| `ukoo://trees/{treeId}/summary` | Tree name, member count, root person, visibility |
| `ukoo://persons/{personId}/profile` | Full person fields including clan, life events |
| `ukoo://users/{userId}/gamification` | XP total, active quests, recent achievements |
| `ukoo://clans/{clanId}/info` | Clan name, totem, praise poem, origin |
| `ukoo://trees/{treeId}/graph` | Adjacency list of all persons + relationships in the tree |

### 7.2 Tools

Tools are invocable functions. The LLM decides when and how to call them based on the conversation and the tool descriptions. Every tool must have:

- A concise, verb-first name
- A description that explains the recommendation type and when to use it
- A typed input schema (JSON Schema / Zod)
- A typed output shape that the LLM can reason over

### 7.3 Prompts

Prompts are reusable templates parameterised at call time. They encode the system context so the LLM produces culturally appropriate, well-structured recommendation text.

| Prompt Name | Purpose |
|---|---|
| `recommend_next_action` | Chooses the single highest-value action for a user given their tree state and gamification profile |
| `explain_merge_suggestion` | Produces a human-readable explanation of why two persons or trees should be merged |
| `summarise_profile_gaps` | Narrates which fields are missing and why they matter culturally |

---

## 8. Tool Catalogue

Each tool below maps to a specific recommendation use case.

---

### `suggest_profile_completions`

**Use case**: 4.1 — Profile Completeness

**Description**: Returns a prioritised list of missing fields for one or more persons in a tree, ordered by cultural and gamification impact.

**Input**:

```json
{
  "treeId": "number",
  "personId": "number | null"
}
```

**Output**:

```json
{
  "suggestions": [
    {
      "personId": 42,
      "personName": "Amina Moyo",
      "missingFields": ["birthDate", "photoUrl", "oralHistory"],
      "impactScore": 0.87,
      "questsUnlocked": ["add_oral_history", "upload_photo"]
    }
  ]
}
```

---

### `find_potential_duplicates`

**Use case**: 4.2 — Potential Duplicate Persons

**Description**: Scans all persons in a tree and compares them against the global person index (public trees only) to find likely duplicates using name similarity, birth year, and clan overlap.

**Input**:

```json
{
  "treeId": "number",
  "similarityThreshold": "number (0–1, default 0.75)"
}
```

**Output**:

```json
{
  "duplicates": [
    {
      "personAId": 12,
      "personBId": 98,
      "confidence": 0.91,
      "matchReasons": ["same_clan", "similar_name", "birth_year_overlap"],
      "suggestedAction": "create_merge_request"
    }
  ]
}
```

---

### `suggest_tree_connections`

**Use case**: 4.3 — Cross-Tree Family Connections

**Description**: Given a tree, finds other public trees that share clan totems, surnames, or geographic origin with persons in this tree. Returns candidate trees and the connecting evidence.

**Input**:

```json
{
  "treeId": "number",
  "maxResults": "number (default 10)"
}
```

**Output**:

```json
{
  "connections": [
    {
      "candidateTreeId": 7,
      "candidateTreeName": "Moyo Family — Zimbabwe",
      "connectingEvidence": [
        {
          "type": "shared_clan",
          "clanId": 3,
          "clanName": "Moyo",
          "totem": "Shumba"
        }
      ],
      "suggestedConnectingPersonId": 12,
      "confidenceScore": 0.82
    }
  ]
}
```

---

### `detect_missing_relationships`

**Use case**: 4.4 — Missing Relationships

**Description**: Analyses the relationship graph for a tree and returns persons with structurally suspicious gaps (no parents, no spouse despite marriage life-events, no recorded children despite known descendants in the tree).

**Input**:

```json
{
  "treeId": "number"
}
```

**Output**:

```json
{
  "gaps": [
    {
      "personId": 55,
      "personName": "Chidi Okafor",
      "gapType": "missing_parents",
      "context": "Has 3 PARENT_CHILD relationships as parent but no parent record himself",
      "suggestedAction": "add_parent_relationship"
    }
  ]
}
```

---

### `discover_clan_network`

**Use case**: 4.5 — Clan Network Discovery

**Description**: Given a clan ID or totem string, returns a list of public trees and persons that share this clan identity, ordered by geographic and temporal proximity to the querying tree.

**Input**:

```json
{
  "clanId": "number | null",
  "totem": "string | null",
  "viewerUserId": "number"
}
```

**Output**:

```json
{
  "clanName": "Moyo",
  "totem": "Shumba",
  "relatedTrees": [
    {
      "treeId": 4,
      "treeName": "Nhete Family",
      "ownerName": "Tariro Nhete",
      "sharedTotem": true,
      "originCountry": "Zimbabwe",
      "personCount": 34
    }
  ]
}
```

---

### `recommend_next_quest`

**Use case**: 4.6 — Gamification Next-Step Quests

**Description**: Returns the single most impactful incomplete quest for a user, explaining how to complete it and what XP/achievement it unlocks.

**Input**:

```json
{
  "userId": "number"
}
```

**Output**:

```json
{
  "quest": {
    "questKey": "add_5_life_events",
    "title": "Chronicle the Journey",
    "description": "Add 5 life events to people in your tree",
    "type": "weekly",
    "currentProgress": 3,
    "targetCount": 5,
    "xpReward": 200,
    "expiresInHours": 38,
    "suggestedPersons": [42, 17]
  }
}
```

---

### `analyse_life_event_gaps`

**Use case**: 4.7 — Life-Event Timeline Gaps

**Description**: For a given person, compares their recorded life events against culturally expected milestones inferred from their `tribeEthnicity`, `originCountry`, and `Relationship` types.

**Input**:

```json
{
  "personId": "number"
}
```

**Output**:

```json
{
  "personId": 42,
  "recordedEvents": ["birth", "traditional_marriage"],
  "expectedButMissing": [
    {
      "eventType": "naming_ceremony",
      "culturalContext": "Common in West African traditions, typically 7–40 days after birth",
      "impactScore": 0.6
    },
    {
      "eventType": "lobola",
      "culturalContext": "Bride-price negotiation preceding traditional marriage in Nguni/Shona cultures",
      "impactScore": 0.75
    }
  ]
}
```

---

### `flag_verification_candidates`

**Use case**: 4.8 — Verification Backlog

**Description**: Returns unverified persons and relationships where corroborating data exists across two or more contributors, making them ready for an admin or tree owner to verify.

**Input**:

```json
{
  "treeId": "number"
}
```

**Output**:

```json
{
  "candidates": [
    {
      "entityType": "person",
      "entityId": 77,
      "entityName": "Nia Asante",
      "corroboratingContributors": [3, 12],
      "verificationReadinessScore": 0.9,
      "evidence": "Two independent contributors entered matching birthDate and clanId"
    }
  ]
}
```

---

### `get_person_details`

**Use case**: Support tool — enriches context before calling other tools

**Description**: Returns the full profile of a person including clan, life events, and all relationship edges. Called by the LLM to gather context before explaining a recommendation.

**Input**:

```json
{
  "personId": "number"
}
```

---

### `create_merge_request`

**Use case**: Action tool — acts on a duplicate or connection recommendation

**Description**: Creates a `MergeRequest` record in the database on behalf of the user. The LLM calls this only after the user confirms a duplicate or connection recommendation.

**Input**:

```json
{
  "type": "duplicate_person | family_trees",
  "sourceId": "number",
  "targetId": "number",
  "connectingPersonId": "number | null",
  "reason": "string",
  "requestedByUserId": "number"
}
```

---

## 9. Implementation Guide

### 9.1 Project Scaffold

Create a new package inside the monorepo (or as a sibling directory):

```
ukoo-mcp-server/
├── src/
│   ├── index.ts              # Entry point — creates and starts the server
│   ├── server.ts             # McpServer instance, registers all tools/resources
│   ├── db.ts                 # TypeORM DataSource (reuses Ukoo's entity classes)
│   ├── tools/
│   │   ├── profile.ts        # suggest_profile_completions, analyse_life_event_gaps
│   │   ├── duplicates.ts     # find_potential_duplicates
│   │   ├── connections.ts    # suggest_tree_connections, discover_clan_network
│   │   ├── graph.ts          # detect_missing_relationships
│   │   ├── gamification.ts   # recommend_next_quest
│   │   ├── verification.ts   # flag_verification_candidates
│   │   └── actions.ts        # create_merge_request
│   ├── resources/
│   │   ├── tree.ts           # ukoo://trees/{treeId}/summary and /graph
│   │   ├── person.ts         # ukoo://persons/{personId}/profile
│   │   └── gamification.ts   # ukoo://users/{userId}/gamification
│   └── prompts/
│       ├── recommend.ts
│       └── explain.ts
├── package.json
└── tsconfig.json
```

**Dependencies**:

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.x",
    "typeorm": "^0.3.x",
    "mysql2": "^3.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsx": "^4.x"
  }
}
```

### 9.2 Database Connection

The MCP server reuses the same TypeORM entity classes from `src/api/entities/`. Configure the DataSource to point at the same MySQL database using environment variables already defined in Ukoo's `.env.example`:

```typescript
// db.ts
import { DataSource } from "typeorm";
import { Person } from "../../src/api/entities/Person";
import { Relationship } from "../../src/api/entities/Relationship";
import { FamilyTree } from "../../src/api/entities/FamilyTree";
// ... import all entities

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [Person, Relationship, FamilyTree, FamilyTreeMember, Clan,
             LifeEvent, MergeRequest, User, UserXP, UserQuest, Quest, Achievement],
  synchronize: false,
  logging: false,
});
```

### 9.3 Registering a Tool

```typescript
// server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { suggestProfileCompletions } from "./tools/profile.js";

const server = new McpServer({
  name: "ukoo-recommendation-engine",
  version: "1.0.0",
});

server.tool(
  "suggest_profile_completions",
  "Returns a prioritised list of missing profile fields for persons in a family tree, ordered by cultural and gamification impact.",
  {
    treeId: z.number().describe("ID of the family tree to analyse"),
    personId: z.number().optional().describe("Scope to a single person, or omit for the whole tree"),
  },
  async ({ treeId, personId }) => {
    const result = await suggestProfileCompletions(treeId, personId ?? null);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);
```

### 9.4 Transport Options

**stdio** (local / Cursor integration):

```typescript
// index.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const transport = new StdioServerTransport();
await server.connect(transport);
```

Register in a `.cursor/mcp.json` or the user's Claude Desktop config:

```json
{
  "mcpServers": {
    "ukoo-recommendations": {
      "command": "node",
      "args": ["./ukoo-mcp-server/dist/index.js"],
      "env": {
        "DB_HOST": "localhost",
        "DB_USERNAME": "ukoo",
        "DB_PASSWORD": "...",
        "DB_DATABASE": "ukoo_db"
      }
    }
  }
}
```

**HTTP + SSE** (in-product, networked):

```typescript
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";

const app = express();
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});
app.post("/messages", express.json(), (req, res) => {
  // forward to active transport
});
app.listen(3001);
```

The Next.js app then instantiates an MCP client pointing at `http://localhost:3001/sse` and forwards user intents through a server-side API route.

---

## 10. Integration with Ukoo

There are two integration patterns:

### Pattern A — Inline AI Chat (in-product)

Add a `/api/ai/chat` route to the Next.js app that:

1. Receives a natural-language message from the user ("What should I add to my tree?").
2. Calls an LLM (e.g., Claude via the Anthropic API) with the MCP tools declared as function/tool definitions.
3. Streams the LLM response back to a chat UI component.
4. When the LLM requests a tool call, the route proxies it to the MCP server over HTTP/SSE.

This gives every Ukoo user an AI assistant that knows their tree and can make recommendations conversationally.

### Pattern B — Background Recommendation Job

A BullMQ job (using the existing Redis + BullMQ setup in `src/queue/`) calls the MCP server on a schedule:

1. For each active user, call `suggest_profile_completions` and `recommend_next_quest`.
2. Persist the results to a new `Recommendation` table.
3. Surface them as notification badges in the UI without requiring an LLM call per page load.

The LLM is only invoked when the user clicks a recommendation to get a natural-language explanation.

---

## 11. Scoring and Ranking Logic

The recommendation engine should rank suggestions so the most impactful one appears first. A composite `impactScore` (0–1) can be computed as:

```
impactScore = (w_xp × xpGain) + (w_complete × completionDelta) + (w_cultural × culturalRelevance) + (w_social × socialSignal)
```

| Weight Component | What It Measures |
|---|---|
| `xpGain` | XP the action would award (normalised by max XP per action) |
| `completionDelta` | How much the action improves the person's completeness percentage |
| `culturalRelevance` | Whether the missing data type is significant for the person's `tribeEthnicity` |
| `socialSignal` | Whether other contributors have touched this person (higher = more trust) |

Suggested default weights: `w_xp = 0.25`, `w_complete = 0.35`, `w_cultural = 0.25`, `w_social = 0.15`. These can be tuned per user cohort (e.g., diaspora users vs. local researchers).

---

## 12. Security Considerations

| Concern | Mitigation |
|---|---|
| **Data exposure** | Every tool that queries persons must respect `isPrivate = true` and `TreeVisibility`. The MCP server should accept a `viewerUserId` parameter and filter results accordingly. |
| **Authorisation** | Tool calls that write data (`create_merge_request`) must verify that `requestedByUserId` has the required `TreeMemberRole` (at minimum `VIEWER` for read, `EDITOR` for write). |
| **Injection** | All SQL queries should use TypeORM's query builder with parameterised inputs — never string interpolation. |
| **Rate limiting** | Expensive graph-traversal tools (e.g., `detect_missing_relationships` on a 500-node tree) should be rate-limited per user using the existing Redis instance. |
| **Secrets** | The MCP server shares the same `.env` file structure as Ukoo. Never log `DB_PASSWORD` or JWT secrets. |

---

## 13. Testing Strategy

**Unit tests** — for scoring functions and similarity algorithms (name matching, birth year overlap):

```
test: suggest_profile_completions returns sorted list by impactScore
test: find_potential_duplicates returns confidence 0 for completely distinct persons
test: detect_missing_relationships flags a person with no parent rows
```

**Integration tests** — spin up a test MySQL database seeded with fixture data (a small family tree of ~10 persons with intentional gaps) and assert that each tool returns the expected shape and values.

**End-to-end** — use the MCP Inspector (`npx @modelcontextprotocol/inspector`) to interactively test the server over stdio before connecting it to an LLM.

---

## 14. Extending the Engine

The tool catalogue above is a foundation. Future extensions that fit naturally into this architecture:

| Extension | Description |
|---|---|
| **DNA / Record Matching** | Ingest GEDCOM files or third-party genealogy APIs; add a `match_external_records` tool |
| **Oral History Transcription** | Accept audio uploads; return a `transcribe_oral_history` tool that populates `Person.oralHistory` |
| **Migration Route Visualisation** | Use `LifeEvent.MIGRATION` records across a tree to reconstruct and recommend visualising diaspora routes |
| **Seasonal Reminders** | A `get_upcoming_memorials` tool that returns persons whose `deathDate` anniversary falls within the next 30 days |
| **Tree Health Score** | A single `get_tree_health_report` tool that aggregates all recommendation signals into one dashboard-ready score |
| **Multi-language Support** | Clan names and praise poems exist in indigenous languages; a `translate_clan_context` tool could call an LLM to produce translations alongside cultural commentary |
