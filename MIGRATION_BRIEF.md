# MIGRATION_BRIEF.md — PropFlow UI Migration

## Read This First

Before writing a single line of code, you must:

1. Read `CLAUDE.md` in the project root — it is the single source of truth for this project
2. Extract and review the file `prototype-reference.zip` — this is the UI prototype reference (exact filename: `prototype-reference.zip`)
3. Read this entire brief

Do not begin any implementation until all three are read in full.

---

## What This Task Is

This project is **PropFlow** — a multi-tenant property management SaaS platform for UK landlords.

A working UI prototype exists in `prototype-reference.zip`. It was built to validate layout, navigation structure, and UX flows. It is **not** production code. It uses inline styles, hardcoded mock data, and no real backend.

Your job is to extract the design intent and UX decisions from that prototype and rebuild them correctly inside the existing Next.js App Router project, wired to the real Supabase backend.

---

## The Prototype Reference File

The prototype file is called **`prototype-reference.zip`** — this is the exact filename, located in the project root. Extract it and use it solely as a visual and structural reference. Do not copy its code.

---

## What to Extract from the Prototype

Extract the following — rebuild correctly, do not copy verbatim:

1. **Sidebar structure** — nav items, icons, collapse behaviour, role-based visibility
2. **Page layouts** — the general grid and card structure of each module
3. **Component patterns** — tables, badges, stat cards, progress bars, action buttons
4. **Colour semantics** — which colours map to which states (green = healthy, red = overdue, amber = warning, etc.)
5. **Data shape** — what fields are displayed per page. Use this to inform TypeScript types only — do not carry over any hardcoded values

---

## What NOT to Carry Over

- ❌ **Inline styles** — use Tailwind CSS classes only, following the design tokens in `CLAUDE.md`
- ❌ **Hardcoded mock data** — every piece of data must come from Supabase. There are no exceptions
- ❌ **Single-file architecture** — follow the project folder structure defined in `CLAUDE.md`
- ❌ **`any` TypeScript types** — strict mode is enforced. Every variable, prop, and return type must be explicitly typed
- ❌ **The `Bookings` module** — this has been replaced by `Tenancies` in the real application
- ❌ **Mock user or organisation data** — the logged-in user and their organisation must always be resolved from the live Supabase session

---

## Data Fetching Rules — Read Carefully

All data in this application is **organisation-scoped**. Every query must follow this pattern without exception:

### Step 1 — Resolve the current user and organisation

Always begin by resolving the authenticated user via Supabase Auth, then look up their organisation from the `profiles` table:

```ts
const { data: { user } } = await supabase.auth.getUser()

const { data: profile } = await supabase
  .from('profiles')
  .select('org_id, role_id')
  .eq('user_id', user.id)
  .single()
```

### Step 2 — Scope all queries to that organisation

Every subsequent query must filter by the resolved `org_id`. Never query a table without an organisation filter:

```ts
const { data: properties } = await supabase
  .from('properties')
  .select('*')
  .eq('org_id', profile.org_id)
```

### Step 3 — Trust Row Level Security, but always filter explicitly too

Row Level Security (RLS) is enabled on every table in the database and will block unauthorised access at the database level. However, you must still filter by `org_id` explicitly in every query. RLS is the safety net — explicit filtering is the standard.

### Step 4 — Use server-side Supabase clients for all data fetching

- Use the **server Supabase client** (from `/lib/supabase/server.ts`) inside `page.tsx` files and server actions
- Use the **browser Supabase client** (from `/lib/supabase/client.ts`) only for client components that require real-time or interactive data
- Never expose the `service_role` key in any client-side code under any circumstances

### Step 5 — Handle loading and error states

Every data fetch must have a loading state and a graceful error state. Do not render pages that assume data is always present.

---

## Database Rules — Critical

The existing database schema must be **preserved exactly as it is**. Do not:

- ❌ Rename any existing table
- ❌ Rename any existing column
- ❌ Change any existing foreign key relationship
- ❌ Drop or modify any existing RLS policy
- ❌ Change how any existing tables link to one another

If the UI requires data that does not yet exist in the schema, you may propose a new migration file to add new tables or columns. Any proposed migration must:

- Be additive only (no destructive changes)
- Follow the existing migration naming convention (`005_<name>.sql`, `006_<name>.sql`, etc.)
- Include RLS policies scoped to `org_id` on any new table
- Be presented for review before being applied — do not apply it automatically

---

## Role-Based UI

The sidebar navigation and page-level actions must respect the user's role, resolved from `profiles.role_id` joined to the `roles` table. Do not hardcode role logic — always derive it from the live session.

Owners and managers see the full navigation. Lower roles (e.g. Maintenance, Viewer) see a restricted set of modules as defined in `CLAUDE.md`.

---

## Tech Stack (Fixed — Do Not Suggest Alternatives)

| Layer       | Technology              |
|-------------|-------------------------|
| Frontend    | Next.js 14 (App Router) |
| Language    | TypeScript (strict)     |
| Styling     | Tailwind CSS            |
| Animations  | Framer Motion           |
| Backend/DB  | Supabase (Postgres)     |
| Payments    | Stripe                  |

---

## Folder Structure

```
/app
  /(auth)
    /login
    /signup
    /invite/[token]
  /(dashboard)
    /[orgSlug]
      /dashboard
      /properties
      /properties/[id]
      /units
      /tenancies
      /tenancies/[id]
      /tenants
      /tenants/[id]
      /rent
      /maintenance
      /compliance
      /documents
      /tasks
      /team
      /settings

/components
  /ui          ← primitive components (Button, Badge, Card, Input, etc.)
  /layout      ← Sidebar, Topbar, PageWrapper
  /modules     ← feature-specific components (PropertyCard, TenancyRow, etc.)

/lib
  /supabase    ← server.ts and client.ts Supabase clients
  /utils       ← helper functions
  /types       ← TypeScript types derived from the DB schema

/supabase
  /migrations  ← numbered SQL files — do not modify existing ones
```

---

## Design Aesthetic

Linear / Stripe / Vercel — professional, clean, data-dense. Not consumer-facing.

- Dark mode supported via Tailwind `dark:` classes
- Follow the design tokens in `CLAUDE.md` exactly
- Do not introduce new colour values, font sizes, or spacing outside the defined system

---

## Order of Work

Complete in this sequence. Do not skip ahead or work on multiple steps simultaneously:

1. `Sidebar` component — collapse behaviour, role-based nav, active state
2. `Topbar` and `PageWrapper` layout shell
3. `Dashboard` overview page — wired to real Supabase data
4. `Properties` list page
5. `Tenancies` list page
6. `Rent Ledger` page
7. `Compliance` page
8. `Maintenance` page
9. `Documents` page
10. `Tasks` page
11. `Team` page
12. `Settings` page

After completing each step, confirm the component matches the prototype's layout intent and that all data is coming from Supabase before moving to the next step.

---

## Branch

All work is being done on branch `feature/new-ui-design`. Do not touch `master` or push anything to `master`. Commit frequently with clear commit messages describing what was built.
