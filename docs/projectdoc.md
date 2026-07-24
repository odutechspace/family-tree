# Family Tree Application — Project Brief

**Odutechspace Limited**
**Issued by:** Arnold Oduma
**Project Code:** OTL-INT-001
**Date:** June 2026

---

## Overview

This is your onboarding project at Odutechspace Limited. You will build a **Family Tree Application** as a two-person team using a single **full-stack Next.js application**. One intern will primarily own the user interface and client experience, while the other will primarily own the API routes, database, authentication, and deployment. The goal is to produce a working, deployed application by the end of the project window.

This document covers everything you need to get started — requirements, architecture, API contracts, data models, and delivery expectations. Read it in full before writing a single line of code.

---

## Team Structure

| Role | Responsibility |
|---|---|
| Frontend-Focused Intern | App Router pages, React components, UI/UX, client-side API integration |
| Backend-Focused Intern | Route Handlers, database schema, authentication, validation, deployment |

You are expected to collaborate daily inside the same codebase. The frontend-focused intern depends on stable API contracts from the backend-focused intern, and the backend-focused intern needs to understand what the pages and components require. **Communicate constantly.**

---

## Tech Stack

### Application
- **Runtime:** Node.js (v20+)
- **Framework:** Next.js 14+ or newer (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Context or Zustand
- **API Layer:** Next.js Route Handlers under `app/api`
- **HTTP Client:** Native `fetch` with typed helper functions or custom hooks
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT stored in secure HTTP-only cookies
- **Tree Visualization:** `react-d3-tree` or `reagraph`

### Shared
- **Version Control:** Git / GitHub
- **API Style:** REST-style JSON endpoints served by Next.js
- **Environment Config:** `.env` files (never committed)

---

## Core Features

The following features are **required**. Nothing ships without all of them working.

### 1. Authentication
- User registration (name, email, password)
- Login / logout
- Protected pages and API routes
- Password hashing with Argon2

### 2. Person Management
- Create a person (name, date of birth, date of death, gender, photo URL, biography)
- Edit a person
- Delete a person
- View a single person's full profile

### 3. Relationship Management
- Link two people with a relationship type: `parent`, `child`, `spouse`, `sibling`
- Remove a relationship
- The system must prevent duplicate or contradictory relationships (e.g. a person cannot be their own parent)

### 4. Tree Visualization
- Render the family tree as an interactive graph
- Clicking a node opens that person's profile panel
- Ability to zoom in/out and pan the canvas

### 5. Search
- Search people by name within the authenticated user's tree

---

## Data Models

### User
```
id           UUID (PK)
name         String
email        String (unique)
password     String (hashed)
createdAt    DateTime
updatedAt    DateTime
```

### Person
```
id           UUID (PK)
firstName    String
lastName     String
dateOfBirth  Date (nullable)
dateOfDeath  Date (nullable)
gender       Enum: MALE | FEMALE | OTHER
photoUrl     String (nullable)
biography    String (nullable)
createdBy    UUID (FK → User)
createdAt    DateTime
updatedAt    DateTime
```

### Relationship
```
id               UUID (PK)
personAId        UUID (FK → Person)
personBId        UUID (FK → Person)
relationshipType Enum: PARENT | CHILD | SPOUSE | SIBLING
createdAt        DateTime
```

---

## API Contract

Base URL: `http://localhost:3000/api`

Protected routes must read the authenticated user from a secure HTTP-only session cookie set during login. When testing with tools like Postman or Insomnia, preserve the cookie returned by the login endpoint.

### Auth Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and set auth cookie |
| POST | `/auth/logout` | Clear auth cookie |
| GET | `/auth/me` | Return current authenticated user |

**POST /auth/register — Request Body**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass123"
}
```

**POST /auth/login — Response**
```json
{
  "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com" }
}
```

The response must also set a secure HTTP-only cookie for authenticated requests.

---

### People Endpoints (all protected)

| Method | Path | Description |
|---|---|---|
| GET | `/people` | List all people for the authenticated user |
| POST | `/people` | Create a new person |
| GET | `/people/:id` | Get a single person |
| PATCH | `/people/:id` | Update a person |
| DELETE | `/people/:id` | Delete a person |
| GET | `/people/search?q=name` | Search people by name |

**POST /people — Request Body**
```json
{
  "firstName": "John",
  "lastName": "Mwangi",
  "dateOfBirth": "1950-03-15",
  "dateOfDeath": null,
  "gender": "MALE",
  "photoUrl": null,
  "biography": "Founder of the family line."
}
```

---

### Relationship Endpoints (all protected)

| Method | Path | Description |
|---|---|---|
| GET | `/relationships` | Get all relationships for the user's tree |
| POST | `/relationships` | Create a relationship |
| DELETE | `/relationships/:id` | Remove a relationship |

**POST /relationships — Request Body**
```json
{
  "personAId": "uuid-of-person-a",
  "personBId": "uuid-of-person-b",
  "relationshipType": "PARENT"
}
```

---

### Tree Endpoint (protected)

| Method | Path | Description |
|---|---|---|
| GET | `/tree` | Return the full tree structure (nodes + edges) |

**GET /tree — Response Shape**
```json
{
  "nodes": [
    { "id": "uuid", "label": "John Mwangi", "data": { ...personFields } }
  ],
  "edges": [
    { "id": "rel-uuid", "source": "uuid-a", "target": "uuid-b", "label": "PARENT" }
  ]
}
```

The dashboard page consumes this directly to render the visualization.

---

## Project Structure

Use one repository and one Next.js application:

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── api/
│   ├── auth/
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   ├── me/route.ts
│   │   └── register/route.ts
│   ├── people/
│   │   ├── route.ts
│   │   ├── search/route.ts
│   │   └── [id]/route.ts
│   ├── relationships/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   └── tree/route.ts
├── dashboard/
│   ├── page.tsx          ← Tree visualization
│   └── layout.tsx
├── people/
│   ├── [id]/page.tsx     ← Person profile
│   └── new/page.tsx      ← Create person form
└── layout.tsx

components/
├── tree/
│   ├── FamilyTree.tsx
│   └── PersonNode.tsx
├── people/
│   ├── PersonCard.tsx
│   └── PersonForm.tsx
└── ui/
    ├── Button.tsx
    └── Modal.tsx

hooks/
├── useAuth.ts
├── usePeople.ts
└── useTree.ts

lib/
├── api.ts         ← typed fetch helpers
├── auth.ts        ← cookie/session helpers
├── db.ts          ← Prisma client
└── validation.ts  ← shared validation schemas

prisma/
├── schema.prisma
└── migrations/
```

---

## Development Workflow

### Setting Up Locally

**Full-stack Next.js app:**
```bash
npm install
cp .env.example .env    # fill in your DB connection string and JWT secret
npx prisma migrate dev
npm run dev
```

### Git Workflow

1. Never commit directly to `main`.
2. Create a branch per feature: `feat/person-crud`, `feat/tree-render`, `fix/auth-refresh`.
3. Open a pull request when the feature is complete.
4. The other intern reviews before merging.
5. Commit messages must be clear: `feat: add person creation endpoint`, `fix: handle null dateOfDeath`.

### Environment Files

Create these and **never commit them**:

**.env**
```
DATABASE_URL=postgresql://user:password@localhost:5432/familytree
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
```

---

## Validation Rules

Route Handlers must enforce these. Forms should mirror them in client-side validation.

| Field | Rule |
|---|---|
| `email` | Valid email format, unique per user |
| `password` | Minimum 8 characters |
| `firstName`, `lastName` | Required, max 100 characters |
| `dateOfBirth` | Must be a valid past date if provided |
| `dateOfDeath` | Must be after `dateOfBirth` if both are set |
| Relationship | `personAId` and `personBId` must not be equal |

---

## Error Handling

**API routes** must return consistent error responses:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["dateOfDeath must be after dateOfBirth"]
}
```

**Pages and components** must handle:
- `401 Unauthorized` → redirect to login
- `403 Forbidden` → show "Access denied" message
- `404 Not Found` → show empty state or "Person not found"
- `500 Server Error` → show generic error toast

---

## UI/UX Expectations

- The application must be **responsive** (works on desktop and tablet).
- Loading states must be visible — use skeleton loaders or spinners.
- Forms must show inline validation errors, not just alerts.
- The tree canvas must have a "Reset view" button to return to the default zoom/pan.
- Empty states must be handled gracefully (e.g. "Your tree is empty — add the first person").

---

## Deliverables

By the project deadline, you must submit:

- [ ] GitHub repository with clean commit history
- [ ] `README.md` with setup instructions for the full-stack Next.js app
- [ ] All required features working end-to-end
- [ ] Prisma migration files committed
- [ ] `.env.example` file with placeholder values, not real secrets
- [ ] At least 5 seed records created using a Prisma seed script
- [ ] A short 5-minute screen recording demo of the working application

---

## Evaluation Criteria

| Area | Weight |
|---|---|
| Feature completeness | 40% |
| Code quality and structure | 25% |
| Collaboration and Git discipline | 15% |
| UI/UX polish | 10% |
| Documentation and README | 10% |

---

## Milestones

| Week | API, Data, Auth | Pages, Components, UX |
|---|---|---|
| Week 1 | Next.js project setup, Prisma schema, auth Route Handlers live | Login/register pages, layout, navigation, typed API helpers |
| Week 2 | People CRUD + relationship Route Handlers live | People CRUD forms + list views complete |
| Week 3 | Tree endpoint + search endpoint live | Tree visualization rendering real data |
| Week 4 | Bug fixes, seed script, deployment prep | Responsive polish, error states, final demo prep |

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Prisma Docs](https://www.prisma.io/docs)
- [react-d3-tree](https://bkrem.github.io/react-d3-tree/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [JWT Introduction](https://jwt.io/introduction)

---

## Questions

Bring blockers to the daily check-in. Do not sit on a problem for more than **two hours** without asking for help. That is not a sign of weakness — it is professional engineering practice.

Good luck. Build something you are proud of.

---

*Odutechspace Limited — Internal Project Document*