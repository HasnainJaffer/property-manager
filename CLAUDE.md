# CLAUDE.md — LetroFlow

Single source of truth. Read fully before writing any code.

---

## Commands

```bash
npm run dev      # localhost:3000
npm run build    # production build + type-check
npm run lint     # ESLint
```

---

## Stack — 13 Layers (fixed — never suggest alternatives)

| # | Layer | Tools / Decisions |
|---|---|---|
| 1 | **Frontend** | Next.js App Router · TypeScript strict (no `any`) · Tailwind CSS · Framer Motion |
| 2 | **APIs & backend logic** | Next.js Route Handlers · Supabase Edge Functions (Deno) for async jobs (rent reminders, compliance expiry alerts) · Resend for email |
| 3 | **Database & storage** | Supabase Postgres · Supabase Storage · PgBouncer connection pooling |
| 4 | **Auth & permissions** | Supabase Auth · `@supabase/ssr` · HttpOnly cookies · 7-role system · RLS enforced at DB level |
| 5 | **Hosting & deployment** | Vercel — auto-deploys `master` → production; branches → preview URLs |
| 6 | **Cloud & compute** | Vercel Edge Network · Supabase on AWS eu-west-2 (London) for UK data residency / GDPR |
| 7 | **CI/CD & version control** | Git · GitHub (`master` branch) · GitHub Actions (lint + type-check on PR) · Vercel auto-deploy on push |
| 8 | **Security & RLS** | RLS on every table · Zod input validation · CSP headers · HTTPS · Supabase Vault for secrets · service role key server-side only |
| 9 | **Rate limiting** | Vercel (basic DDoS) · Supabase plan limits · Upstash Redis + `@upstash/ratelimit` on sensitive routes (auth, webhooks) when scaling |
| 10 | **Caching & CDN** | Vercel CDN (static assets) · Next.js `fetch()` cache · ISR / `React.cache()` · OrgDataContext (in-memory session cache) |
| 11 | **Load balancing & scaling** | Vercel serverless (auto-scales to zero and out) · Supabase managed scaling on Pro plan · Stateless Route Handlers |
| 12 | **Error tracking & logs** | Sentry (frontend + backend exceptions) · Vercel log drain · Supabase log explorer · Next.js error boundaries |
| 13 | **Availability & recovery** | Supabase Pro: daily backups + PITR (7 days) · Vercel 99.99% SLA · Graceful degradation · Status page (Instatus) for incident comms |

**Payments:** Stripe — Checkout → webhook → Edge Function → update `organisations.plan`

Path alias: `@/` → `src/`. Never use relative `../../` imports.

---

## What We're Building

Multi-tenant UK **buy-to-let property management SaaS**. Think "Xero for property management." One account → many organisations, each fully isolated via RLS. Target user: landlord / property manager (not tenants).

Deployed at: **https://property-manager-orpin.vercel.app** (Vercel, `master` branch)

Two domains (both on the same Vercel project, same `master` branch):
- **`letroflow.com`** — marketing landing page (`src/app/landing/`), routed via middleware hostname check
- **`app.letroflow.com`** — the full property management app

---

## Page Wrapper Pattern

Every page under `/(dashboard)/[orgSlug]/` must use:

```tsx
'use client'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'

export default function MyPage() {
  return (
    <AppShell title="Title" subtitle="subtitle">
      <PageWrapper>
        <div className="p-6">{/* content */}</div>
      </PageWrapper>
    </AppShell>
  )
}
```

URL segment must match a sidebar `navItems` key: `dashboard`, `properties`, `tenancies`, `tenants`, `rent`, `compliance`, `maintenance`, `team`, `settings`.

---

## Data Layer — `useOrgData()`

All pages read from `OrgDataContext` (`src/lib/org-data-context.tsx`). Bootstrapped once in `src/app/(dashboard)/[orgSlug]/layout.tsx`. **Pages must not run their own Supabase queries.**

```typescript
const { orgId, properties, tenants, tenancies, charges, certs, issues, members, invitations, roles, loading, orgName, orgTypeLabel, currentUser } = useOrgData()

// After mutations, call targeted refresh:
const { refreshProperties, refreshCharges, refreshCerts, refreshIssues, refreshTeam } = useOrgData()

// Optimistic updates:
const { updateIssueStatus, cancelInvite } = useOrgData()
```

---

## Key UI Components

- **`CrystalSelect`** — use instead of `<select>`. Portal-rendered (always above modals), auto-flips. `import CrystalSelect from '@/components/ui/CrystalSelect'`
- **`CrystalDatePicker`** — use instead of `<input type="date">`. UK display (DD/MM/YYYY), ISO storage (YYYY-MM-DD). Same portal architecture.
- **`useCountUp`** — extract to `@/lib/hooks/useCountUp.ts` before reuse. Currently inline in dashboard page.
- **Mock data** — `@/lib/mock-data.ts`. Field names match DB schema exactly.

---

## Design System

**Aesthetic:** Linear / Stripe / Vercel — dark, clean, data-dense.

### Crystal CSS tokens (defined in `globals.css` — always use these, never hardcode):

```css
--bg          /* #07090f */
--surface     /* rgba(255,255,255,0.04) */
--border      /* rgba(255,255,255,0.08) */
--text        /* #e7ecf3 */
--text-dim    /* #98a2b3 */
--text-mute
--indigo      /* #818cf8 */
--indigo-2    /* #6366f1 */
--cyan  --mint  --rose  --amber  --glow-i
```

### Glassmorphism card pattern:
```css
background: var(--surface);
border: 1px solid var(--border);
border-radius: 14–16px;
backdrop-filter: blur(20px);  /* stripped on mobile via media query */
```

### Crystal utility classes:
`.crystal-input` `.crystal-select` `.crystal-modal` `.crystal-table-row` `.crystal-modal-overlay`
`.crystal-pill` + `.healthy` (mint) / `.warn` (amber) / `.arrears` (rose) / `.void` (gray) / `.dot`

### Primary CTA button:
```css
background: linear-gradient(180deg, var(--indigo), var(--indigo-2));
box-shadow: 0 4px 16px var(--glow-i);
color: #fff; border: none; border-radius: 9px;
```

### Status colours (use exactly):
| Status | Classes |
|---|---|
| Active / Paid / Valid | `bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400` |
| Expiring / Warning | `bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400` |
| Overdue / Danger | `bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400` |
| In Progress | `bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400` |
| Void / Neutral | `bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400` |

### Framer Motion (required on every page):
```typescript
// Page transition — note: ease must use `as const` to satisfy Framer Motion's strict Easing type
const pageVariants = { hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' as const } } }

// List stagger
const containerVariants = { visible: { transition: { staggerChildren: 0.04 } } }
const itemVariants = { hidden: { opacity: 0, y: 3 }, visible: { opacity: 1, y: 0, transition: { duration: 0.15 } } }
```

### Mobile:
- `backdrop-filter: none` on ≤768px (performance — blur is GPU-expensive on mobile)
- Ambient blobs: `className="hidden md:block"`
- Desktop layout: `hidden md:block` / `hidden md:flex` — Mobile layout: `flex md:hidden`
- Topbar: hamburger + title row 1, subtitle row 2; action button `w-[34px] md:w-auto`

### Tabler Icons:
```typescript
import { IconBuildingEstate } from '@tabler/icons-react'
```
String keys like `'ti-building-estate'` mapped in `Sidebar.tsx` — add new mappings there.

---

## Sidebar Nav & Role Visibility

Nav order: Dashboard | Properties, Tenancies, Tenants | Rent Ledger | Compliance, Maintenance | Team, Settings

| Nav item | owner | manager | accountant | staff | maintenance | cleaner | viewer |
|---|---|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Properties | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Tenancies | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Tenants | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Rent Ledger | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Compliance | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Maintenance | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Team | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

Cleaner gets a separate simplified task interface — not the main dashboard.

---

## Database

### Rules for every new table:
- `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` + trigger (for mutable tables)
- `org_id` column (or reaches org via FK)
- RLS enabled + policies written
- Indexes on every `org_id`, `user_id`, FK, and frequently-filtered column

### Naming: `snake_case` tables (plural), columns; `idx_[table]_[col]` indexes; `trg_[table]_[action]` triggers

### RLS pattern:
```sql
-- SELECT: USING (org_id IN (SELECT get_my_org_ids()))
-- INSERT/UPDATE: inline subquery checking profiles + roles
```

### ⚠️ Never chain `.select()` after INSERT:
```typescript
// ✅ Insert then refetch
await supabase.from('certificates').insert({ ... })
await fetchData()

// ❌ Will fail — RLS applied to RETURNING clause before row commits
await supabase.from('certificates').insert({ ... }).select()
```

### Supabase type casting for nested joins:
```typescript
const org = invite.organisations as unknown as { name: string } | null  // ✅
```

### Migration status:

| File | Status |
|---|---|
| `001_foundation.sql` | ✅ Running — extensions, orgs, roles, profiles, members, invitations, RLS helpers |
| `002_properties.sql` | ✅ Running — property_types, properties, unit_types, units, amenities |
| `003_tenants.sql` | ✅ Running — tenants, guarantors, references, documents (Right to Rent) |
| `004_tenancies.sql` | ✅ Running — tenancies, tenancy_tenants, renewals, terminations, documents |
| `005_rent.sql` | ✅ Running — rent_schedules, charges, payments, allocations, arrears_log |
| `006_maintenance.sql` | ✅ Running — issues, work_orders, notes, vendors |
| `007_compliance.sql` | ✅ Running — certificates, hmo_licences, inspections (status auto-computed by trigger) |
| `008_tasks.sql` | ✅ Running — tasks, task_assignments |
| `009_documents.sql` | ✅ Running — documents (polymorphic) |
| `010_notifications.sql` | ✅ Running — notifications, audit_log |
| `011_reporting.sql` | ✅ Running — occupancy_snapshots, financials, valuations |
| `012_delete_property.sql` | ✅ Running — SECURITY DEFINER cascade delete function |
| `013_delete_account.sql` | ✅ Running — SECURITY DEFINER account + org cascade delete, returns orphaned member IDs |

---

## Auth & Multi-Tenancy

- **Signup** → create account → create first org → become `owner` → profile auto-created by DB trigger
- **Staff** → invited by owner/manager only (no public registration) → token link → accept → profile + member row created
- **Org switching** → user can belong to many orgs; org switcher in sidebar
- **Login fix** (deployed): native `<form method="POST" action="/api/auth/login">` with 303 redirect. Do not revert to `fetch()`-based login — it breaks cookie timing on HTTPS.
- **Admin client** (`/lib/supabase/admin.ts`) — service role, server-only, bypasses RLS. Never import in client components. Never expose `SUPABASE_SERVICE_ROLE_KEY` client-side.
- **`handle_new_user` trigger** fires before auth completes — RLS policies on `roles`/`profiles` must not use `TO authenticated`.

---

## Email Invites

- `/api/team/invite` — POST; verifies owner/manager role; generates token; sends dark HTML email via Resend; rolls back if email fails. Sender: `noreply@invites.letroflow.com`.
- `/api/team/invite/accept` — POST `{ token, firstName?, lastName?, password? }`:
  - **New user** (password provided): admin creates auth user with `email_confirm: true` (skips email confirmation), creates profile, marks accepted. Client then calls `signInWithPassword`.
  - **Existing user** (no password): requires authenticated session; creates profile + marks accepted.
- `/invite/[token]/page.tsx` — server component; uses admin client for unauthenticated token validation. `export const dynamic = 'force-dynamic'` required.
- `InviteAcceptCard.tsx` — client component with two modes: **signup** (default — name + password fields) and **signin** (toggle for existing users). Never shows "Accept" without first establishing a session.
- **Resend note:** `onboarding@resend.dev` only delivers to the Resend account owner in dev. Use verified custom domain in production (currently `invites.letroflow.com`).
- **service_role GRANTs:** `BYPASSRLS` bypasses RLS policies but NOT table-level PostgreSQL grants. If the service role gets "permission denied for table X", run: `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;` in Supabase SQL Editor.

---

## Billing

`organisations.plan` column: `free` | `starter` | `pro` | `enterprise`. Schema is ready — Stripe integration pending. Flow: Stripe Checkout → webhook → Supabase Edge Function → update `plan`.

---

## UK-Specific Rules

- Dates: DD/MM/YYYY display, YYYY-MM-DD storage
- Currency: GBP (£)
- Tenancy type: Assured Shorthold Tenancy (AST)
- Tenancy status flow: `active` → `periodic` → `in_notice` → `ended`
- Gas Safety: annual (£6k fine if missing, cannot serve notice)
- EICR: 5 years; EPC: 10 years (must be E+); Deposit: protected within 30 days
- Compliance alerts at 90, 60, and 30 days before expiry

---

## Frontend Build Status

| Page / Feature | Status |
|---|---|
| App shell (Sidebar, Topbar, PageWrapper, AppShell) | ✅ |
| Dashboard | ✅ Real Supabase data |
| Properties | ✅ Real Supabase data |
| Tenancies | ✅ Real Supabase data |
| Tenants | ✅ Real Supabase data |
| Rent Ledger | ✅ Real Supabase data |
| Compliance | ✅ Real Supabase data |
| Maintenance (Crystal Kanban) | ✅ Real Supabase data |
| Team | ✅ Real Supabase data |
| Settings | ✅ Real Supabase data |
| Auth pages (login, signup) — Crystal design | ✅ |
| Onboarding — Crystal design | ✅ |
| Email invite system (Resend) | ✅ |
| Invite acceptance flow (signup + signin) | ✅ |
| Org data cache (`OrgDataProvider`) | ✅ |
| `CrystalSelect` custom dropdown | ✅ |
| `CrystalDatePicker` custom calendar | ✅ |
| Mobile drawer (`MobileDrawer.tsx`) | ✅ |
| Mobile topbar layout | ✅ |
| Mobile performance (blur disabled) | ✅ |
| Maintenance — mobile tab layout | ✅ |
| Compliance — mobile card + detail modal | ✅ |
| Login cookie bug fix (Vercel HTTPS) | ✅ |
| Live sidebar badge counts | ✅ |
| Sidebar flicker fix | ✅ |
| Deploy to Vercel | ✅ |
| Migrations 008–011 | ✅ |
| Migration 012 (delete_property_cascade) | ✅ |
| Tenancies page — Add modal, detail modal, mobile cards | ✅ |
| Tenancies page — Edit modal + hover-expand EditButton | ✅ |
| Tenants page — Add modal, mobile cards | ✅ |
| Tenants page — RTR status values fixed (DB constraint) | ✅ |
| Rent Ledger — Add Charge modal, mobile cards, bar chart | ✅ |
| Properties — unit/property model (detail modal, per-unit CRUD) | ✅ |
| Table header padding parity (Tenants, Tenancies, Team) | ✅ |
| Column dividers + compact widths (Tenants, Tenancies, Compliance) | ✅ |
| Invite acceptance — inline signup/signin form with password | ✅ |
| Invite — accepted invites hidden from pending list | ✅ |
| Rebrand: PropFlow → LetroFlow (all UI, emails, metadata) | ✅ |
| Delete account — Danger Zone in Settings, cascade function, API route | ✅ |
| Landing page — Crystal marketing site (`src/app/landing/`) | ✅ |
| Hostname routing — `letroflow.com` → `/landing` via `middleware.ts` | ✅ |
| GooeyNav — scroll-to-clear pill nav in landing navbar | ✅ |
| Logo assets committed — `public/logo/` SVG + PNGs served statically | ✅ |
| Auth pages — real lockup SVG logo inside card, replaces placeholder | ✅ |
| Favicon — app.letroflow.com root layout (`src/app/layout.tsx`) | ✅ |
| Remaining mobile page layouts (Properties, Team, Dashboard) | 🔜 |
| Stripe billing integration | 🔜 |

---

## Patterns & Notes (keep updated each session)

### Properties — unit/property model (implemented)

- **One card per property** on the Properties page. The `Add Property` form inserts into `properties` only — no unit fields.
- Clicking "Details →" on a property card opens `PropertyDetailModal` (in `properties/page.tsx`), which shows: property type/address, financial stat grid, units list, add-unit inline form, edit-property form, and a danger zone (owner-only delete).
- `detailPropertyId: string | null` is stored in page state; `detailProperty` is looked up live (`properties.find(p => p.id === detailPropertyId)`) so the modal auto-refreshes after mutations without closing.
- Each unit row in the detail modal has three states: **view / edit (inline form) / remove-confirm**. All mutations call `refreshProperties()`.
- `OrgDataContext` `PropertyUnit` type includes `unit_type_id` and `unit_types: { label: string } | null`. `PropertyRow` includes `property_type_id`. The `refreshProperties` query fetches these.
- Any properties created before this fix (with the old broken unit-per-card flow) may have orphaned `units` rows — clean up manually in Supabase if needed.

### EditButton hover-expand pattern (Tenancies page)

Expanding icon → "Edit" text on hover without reflowing the table row:

```tsx
// Fixed-width outer wrapper — table column always sizes against this, never the button
<div style={{ width: 68, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
  <button style={{ flexDirection: 'row-reverse', gap: 5 }}>
    <IconPencil size={13} style={{ flexShrink: 0 }} />
    {/* icon stays right-anchored; text slides in from the left */}
    <span style={{ maxWidth: hovered ? 30 : 0, opacity: hovered ? 1 : 0,
      overflow: 'hidden', transition: 'max-width 0.2s ease, opacity 0.15s ease' }}>Edit</span>
  </button>
</div>
```

### Compact table columns (eliminating empty right-side space)

Add `style={{ width: 1 }}` to `<th>` / `<td>` for columns that should hug their content (dates, amounts, status pills, action buttons). Text-heavy columns without this style expand to fill the remaining space.

### Edit modal grid stability

Use `gridTemplateColumns: 'repeat(N, minmax(0, 1fr))'` (not `repeat(N, 1fr)`) for all grid rows in modals. The `minmax(0, 1fr)` cap prevents long dropdown labels from expanding a column beyond its fair share, which would shift adjacent columns.

### Tenants — Right to Rent status values

Valid DB check-constraint values for `tenants.right_to_rent_status`:
```typescript
const RTR_OPTIONS = [
  { value: 'not_checked',  label: 'Not yet checked' },
  { value: 'unlimited',    label: 'Passed — UK / Settled status' },
  { value: 'time_limited', label: 'Time-limited right to rent' },
  { value: 'failed',       label: 'Failed check' },
]
```
Do **not** use `'passed'` or `'not_applicable'` — they violate the constraint.

### Column dividers — short tick pattern (Tenants, Tenancies, Compliance tables)

Faint vertical ticks between table columns using a background gradient — not a full-height border:

```typescript
const colDivider: React.CSSProperties = {
  backgroundImage: 'linear-gradient(to bottom, transparent 15%, rgba(255,255,255,0.08) 15%, rgba(255,255,255,0.08) 85%, transparent 85%)',
  backgroundSize: '1px 100%',
  backgroundPosition: 'right center',
  backgroundRepeat: 'no-repeat',
}
const thStyle: React.CSSProperties = { padding: '12px 12px 10px', ..., ...colDivider }
const tdBase:  React.CSSProperties = { padding: '11px 12px', ..., ...colDivider }
```

Override with `backgroundImage: 'none'` on the last column and any column that shouldn't have a divider (e.g. the Edit action column). Add `paddingRight: 128` on `<th>` and `<td>` of columns that need extra visual separation.

### Invite acceptance flow (redesigned)

`/invite/[token]` shows an inline signup/signin form — no redirect to `/login` or `/signup`.

- **Default (signup mode):** email (read-only), first name, last name, password, confirm password → POST `/api/team/invite/accept` with `{ token, firstName, lastName, password }` → server creates auth user via `admin.auth.admin.createUser({ email_confirm: true })`, inserts profile, marks accepted → client calls `signInWithPassword` → redirect to org dashboard.
- **Sign-in mode (toggle):** email (read-only), password → client `signInWithPassword` → POST `/api/team/invite/accept` with `{ token }` only → server reads authenticated session, inserts profile, marks accepted → redirect.
- `email_confirm: true` skips Supabase's email confirmation step — safe because the email was already verified by receiving the invite.
- Do NOT pass `org_id` in `user_metadata` when creating invited users — the `handle_new_user` trigger will skip profile creation (it only fires when `org_id` is present), and the accept route creates the profile manually.
- Accepted invitations are filtered out of the pending list via `.is('accepted_at', null)` in `OrgDataContext` — both the initial load and `refreshTeam` queries.

### Delete account — cascade function pattern

`/api/account/delete` (POST, auth required):
1. Calls `supabase.rpc('delete_account_cascade', { p_user_id })` via admin client
2. Function deletes all owned org data in FK-safe order (see migration 013), returns orphaned member `user_id[]`
3. API calls `admin.auth.admin.deleteUser(id)` for each orphaned member
4. API calls `admin.auth.admin.deleteUser(userId)` for the requesting user
5. Client calls `supabase.auth.signOut()` then `router.push('/login')`

FK deletion order inside `delete_account_cascade`:
`work_orders → tenancy_terminations → tasks → inspections → hmo_licences → certificates → issues → tenancies → tenants → vendors → properties → organisations`

The final `DELETE FROM organisations` cascades automatically to: `profiles`, `invitations`, `documents`, `notifications`, `audit_log`, `occupancy_snapshots`, `financial_summaries`, `arrears_log`.

⚠️ Non-owner account deletion doesn't call the function — it just deletes the auth user and relies on `profiles.user_id → auth.users ON DELETE CASCADE`.

The Settings page Danger Zone card shows role-appropriate warning text (`currentUser.role === 'owner'` to detect), and requires typing `DELETE` in a confirmation input before the button activates.

### Landing page architecture

The landing page lives at `src/app/landing/` — a standalone route group, fully isolated from `(auth)` and `(dashboard)`.

**Files:**
- `src/app/landing/layout.tsx` — Plus Jakarta Sans font (weights 400–800), imports `landing.css`, full metadata + favicon icons
- `src/app/landing/landing.css` — All landing-specific styles (`.glass`, `.grad`, `.btn-primary`, `.feat-card`, navbar, mobile menu, scroll reveal, pricing, compliance rows). Never mix with `globals.css`.
- `src/app/landing/page.tsx` — Full React landing page with sections: hero, features, how-it-works, compliance, pricing
- `src/app/landing/GooeyNav.tsx` — TypeScript GooeyNav component (see below)
- `src/app/landing/GooeyNav.css` — Gooey effect styles with Crystal color tokens

**Hostname routing (middleware.ts):**
```typescript
const host = request.headers.get('host') ?? ''
const isMarketingDomain = host === 'letroflow.com' || host === 'www.letroflow.com'
if (isMarketingDomain) {
  const url = request.nextUrl.clone()
  url.pathname = '/landing'
  return NextResponse.rewrite(url)
}
```
This check runs **before** Supabase auth in middleware — marketing domain gets an immediate rewrite with no auth overhead. `/landing` and `/invite/` are also in the `isPublic` list.

Local dev: visit `http://localhost:3000/landing` directly (hostname check only fires on `letroflow.com`).

**Navbar (`#lf-navbar`):**
- Fixed, floating pill: `position: fixed; top: 14px; left: 50%; transform: translateX(-50%)`
- `overflow: hidden` is **required** on the navbar wrapper to clip the GooeyNav filter's `inset: -75px` black `::before` bleed box
- Mobile menu uses `max-height` + `overflow: hidden` transition. Set `borderTop` and `padding` conditionally in JSX (not CSS) — they render even at `max-height: 0` otherwise

**Anchor scroll offset:** All sections navigated to via nav links have `scrollMarginTop: '90px'` to clear the fixed navbar.

### GooeyNav component (`src/app/landing/GooeyNav.tsx`)

Gooey blob physics: SVG filter `feGaussianBlur + feColorMatrix` + `mix-blend-mode: lighten` + black `::before` backdrop clipped by `overflow: hidden` on the parent.

**Scroll-to-clear behaviour:**
- `justClickedRef` + 900ms `setTimeout` (`clickTimerRef`) creates an ignore window after a click, preventing the anchor-scroll from immediately clearing the active highlight
- `clearActive()`: sets `activeIndex(-1)`, removes `.active` class from filter/text refs, sets width/height to `'0'`, and **sets `textRef.current.innerText = ''`** — the last step is required to prevent ghost text from leaking out at `height: 0`
- `.effect.text { overflow: hidden }` in CSS clips any remaining ghost text — apply on `.effect.text` only, **not** `.effect` base class (that clips the filter `::before` bleed and breaks particle animations)

**TypeScript gotchas:**
```typescript
const noise = (n: number = 1) => ...           // must annotate n — strict TS complains at `(n = 1)`
const clickTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)  // needs explicit undefined
```

**Crystal color tokens in `GooeyNav.css`:**
```css
--gooey-color-1: #818cf8;  /* indigo */
--gooey-color-2: #67e8f9;  /* cyan */
--gooey-color-3: #34d399;  /* mint */
--gooey-color-4: #fbbf24;  /* amber */
```
Prefix is `--gooey-color-*` (not `--color-*`) to avoid polluting the global namespace.

### Auth page logo pattern

All auth pages (login, signup, onboarding, invite) use the real SVG lockup instead of a placeholder. Logo is placed **inside** the card div so it aligns with the input fields:

```tsx
{/* Inside the card padding div, above the heading */}
<div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src="/logo/letroflow-lockup-dark.svg" alt="LetroFlow" height={38} style={{ display: 'block' }} />
</div>
```

Do **not** place the logo above/outside the card — it centres against the full container width (400px), not the card's padded input area, and will look misaligned.

**Logo assets** live in `public/logo/` (committed to git — must be committed for Vercel to serve them):
- `letroflow-mark.svg` — icon only (used for favicon)
- `letroflow-lockup-dark.svg` — icon + wordmark on dark backgrounds
- `letroflow-lockup-light.svg` — icon + wordmark on light backgrounds
- `public/logo/png/` — PNG sizes: 16, 32, 48, 180, 192, 512

**Favicon** is wired in `src/app/layout.tsx` via the `metadata.icons` field — applies to `app.letroflow.com`. The landing layout (`src/app/landing/layout.tsx`) has its own separate favicon config.

---

## Claude Code Rules

- Never change the tech stack
- Never skip migrations — write SQL before the frontend that depends on it
- No `any` types; no plain `.js` files
- Always enable RLS + write policies on every new table
- Always add `updated_at` triggers and indexes
- Dark mode required on every component (`dark:` classes)
- UK-first: DD/MM/YYYY, GBP, UK postcodes
- Ask before adding any new npm dependency
- Use mock data from `@/lib/mock-data.ts` first; wire Supabase after
- Match the Crystal design system exactly — do not invent new patterns
- Framer Motion on every page (page transition + list stagger)
- Status colours are fixed — use the exact classes above
- Update this file after completing each task (mark ✅ in the status table)
