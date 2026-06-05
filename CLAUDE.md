# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# PropFlow Property Management Platform

This file is the single source of truth for this project.
Read it fully before writing any code, creating any file, or making any architectural decision.

---

## Development Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build (runs type-check)
npm run lint     # ESLint check
```

No test suite is configured yet. Type-check is implicit in `next build`.

---

## Implementation Patterns

### TypeScript path alias
`@/` resolves to `src/`. Use `@/lib/...`, `@/components/...` etc. — never relative `../../` imports.

### Creating a new dashboard page
Every page under `/(dashboard)/[orgSlug]/` follows this wrapper pattern:

```tsx
'use client'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'

export default function MyPage() {
  return (
    <AppShell title="Page Title" subtitle="context subtitle here">
      <PageWrapper>
        <div className="p-6">
          {/* page content */}
        </div>
      </PageWrapper>
    </AppShell>
  )
}
```

`AppShell` reads `usePathname()` to derive the active sidebar item — the URL segment must match a key in Sidebar's `navItems` (`dashboard`, `properties`, `tenancies`, `tenants`, `rent`, `compliance`, `maintenance`, `team`, `settings`).

### Tabler Icons
Import named exports from `@tabler/icons-react`: `import { IconBuildingEstate } from '@tabler/icons-react'`. The sidebar config uses string keys like `'ti-building-estate'` mapped to icon components inside `Sidebar.tsx` — add new mappings there if needed.

### `useCountUp` hook
Currently defined inline in `dashboard/page.tsx`. Extract to `@/lib/hooks/useCountUp.ts` before reusing on other pages.

### Mock data
All pages consume named exports from `@/lib/mock-data.ts`. The file exports typed constants that match DB schema field names exactly — use those field names when writing Supabase queries later.

### Org data cache — `useOrgData()`
All dashboard pages read live data from `OrgDataContext` (`src/lib/org-data-context.tsx`). The context is bootstrapped once in `src/app/(dashboard)/[orgSlug]/layout.tsx` and persists for the entire session. Pages **must not** fetch their own data from Supabase — they read from the hook:

```typescript
const { orgId, properties, tenants, tenancies, charges, certs, issues, members, invitations, roles, loading } = useOrgData()
```

After a mutation (insert/update/delete), call the appropriate targeted refresh instead of re-fetching everything:

```typescript
const { refreshProperties, refreshCharges, refreshCerts, refreshIssues, refreshTeam } = useOrgData()
```

Optimistic updates (status changes, cancel invite) are also handled by the context:

```typescript
const { updateIssueStatus, cancelInvite } = useOrgData()
```

The context also provides sidebar shell data (`orgName`, `orgTypeLabel`, `currentUser`) so `AppShell` never re-fetches on navigation.

### `CrystalSelect` — custom dropdown
Use instead of `<select className="crystal-select">` everywhere. Renders into a `document.body` portal (position: fixed) so it always appears above modal overflow containers. Auto-flips upward when near the bottom of the screen.

```tsx
import CrystalSelect from '@/components/ui/CrystalSelect'

<CrystalSelect
  value={form.property_id}
  onChange={v => set('property_id', v)}
  options={properties.map(p => ({ value: p.id, label: p.name }))}
  placeholder="Select property…"
/>
```

Static option arrays should be defined as module-level constants (not inline) to prevent recreation on each render.

### `CrystalDatePicker` — custom calendar
Use instead of `<input type="date" className="crystal-input">` everywhere. Same portal architecture as `CrystalSelect`. Displays dates in UK format (DD/MM/YYYY), stores in ISO format (YYYY-MM-DD). Has a Today shortcut and auto-flips upward.

```tsx
import CrystalDatePicker from '@/components/ui/CrystalDatePicker'

<CrystalDatePicker
  value={form.purchase_date}   // YYYY-MM-DD or ''
  onChange={v => set('purchase_date', v)}
/>
```

---

## What We Are Building

A **multi-tenant property management SaaS platform** for the UK market.

The best way to think about it: **"Xero for property management"** — a web application where property businesses sign up, create an organisation, and manage their entire portfolio from one centralised dashboard.

**Brand name: PropFlow**

The **initial focus is buy-to-let (BTL) residential property**. The architecture must be designed to expand to other portfolio types later (HMO, serviced accommodation, holiday lets, commercial) without requiring a schema rebuild.

The target customer is the **owner or manager of a BTL property portfolio** — a landlord or property management company. Not a tenant. Not a guest. The software is an internal operational tool for the people running the business.

The UI must be **intuitive for non-technical users**. Labels, actions, and flows must be self-explanatory without any training or manual.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js (App Router) | React-based, file-system routing |
| Styling | Tailwind CSS | Utility-first, dark mode via `dark:` classes |
| Animations | Framer Motion | Page transitions, list animations, micro-interactions |
| Backend / DB | Supabase (Postgres) | Auth, Storage, Realtime, Edge Functions |
| Payments | Stripe | Subscription billing, webhooks to update `plan` column |
| Language | TypeScript | Strict mode. No `any` types. |

**Never suggest alternative technologies.** This stack is decided and fixed.

---

## Project Structure (Next.js App Router)

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
  /ui          ← shared primitive components (Button, Badge, Card, Input, etc.)
  /layout      ← Sidebar, Topbar, PageWrapper
  /modules     ← feature-specific components (PropertyCard, TenancyRow, etc.)
/lib
  /supabase    ← supabase client (browser + server)
  /mock-data.ts ← realistic mock data matching DB schema exactly
  /utils       ← helper functions
  /types       ← TypeScript types derived from DB schema
/supabase
  /migrations  ← numbered SQL files (001_foundation.sql, 002_properties.sql, etc.)
```

---

## Design System — CONFIRMED AND APPROVED

The design has been reviewed and approved. Build all frontend components to match this spec exactly. Do not invent new patterns.

### Aesthetic
**Linear / Stripe / Vercel** — professional, clean, data-dense. Not consumer-facing or colourful. Users are property professionals, but the interface must be intuitive for non-technical users. Every action should be obvious without explanation.

### Crystal Design System (used on all pages — auth, invite, team, maintenance, and new pages going forward)

All pages now use a dark-theme CSS-custom-property system defined in `src/app/globals.css`. These tokens must be used instead of hardcoded colours.

**Core tokens:**
```css
--bg          /* page background: #07090f */
--surface     /* card/panel: rgba(255,255,255,0.04) */
--surface-2   /* elevated surface */
--border      /* border: rgba(255,255,255,0.08) */
--text        /* primary text: #e7ecf3 */
--text-dim    /* secondary text: #98a2b3 */
--text-mute   /* muted/label text */
--indigo      /* #818cf8 — primary accent */
--indigo-2    /* #6366f1 — darker indigo for gradients */
--cyan        /* #22d3ee */
--mint        /* #34d399 */
--rose        /* #fb7185 */
--amber       /* #fbbf24 */
--glow-i      /* indigo glow for box-shadow */
```

**Glassmorphism cards** — use for all panels, modals, and content cards:
```css
background: var(--surface);
border: 1px solid var(--border);
border-radius: 14–16px;
backdrop-filter: blur(20px);
box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 40px -8px rgba(0,0,0,0.5);
```

**Crystal utility classes** (defined in globals.css):
- `.crystal-input` — dark-themed text input
- `.crystal-select` — dark-themed select dropdown
- `.crystal-pill` — badge/pill base class
- `.crystal-pill.healthy` — mint/green status (active, accepted)
- `.crystal-pill.warn` — amber status (pending, expiring)
- `.crystal-pill.arrears` — rose/red status (overdue, expired)
- `.crystal-pill.void` — gray/neutral status
- `.crystal-pill.dot` — adds animated dot indicator before text
- `.crystal-modal` — modal panel (surface + border + blur)
- `.crystal-table-row` — table row with hover state
- `.crystal-modal-overlay` — modal backdrop

**Primary CTA button** (indigo gradient):
```css
background: linear-gradient(180deg, var(--indigo), var(--indigo-2));
box-shadow: 0 4px 16px var(--glow-i);
color: #fff; border: none; border-radius: 9px;
```

**Ambient background blobs** (auth/invite pages only):
```tsx
{/* Top-left blob */}
<div aria-hidden style={{
  position: 'absolute', top: -200, left: -160,
  width: 560, height: 560, borderRadius: '50%',
  background: 'radial-gradient(closest-side, #1e1b4b, transparent 70%)',
  filter: 'blur(80px)', opacity: 0.9, pointerEvents: 'none',
}} />
{/* Bottom-right blob */}
<div aria-hidden style={{
  position: 'absolute', bottom: -220, right: -180,
  width: 640, height: 640, borderRadius: '50%',
  background: 'radial-gradient(closest-side, #0c4a6e, transparent 70%)',
  filter: 'blur(80px)', opacity: 0.9, pointerEvents: 'none',
}} />
```

**Brand mark** (conic gradient logo — used on auth/invite pages):
```tsx
<div style={{
  width: 32, height: 32, borderRadius: 9, position: 'relative',
  background: 'conic-gradient(from 140deg, var(--indigo), var(--cyan), var(--mint), var(--indigo))',
  boxShadow: '0 6px 20px var(--glow-i), inset 0 0 0 1px rgba(255,255,255,.2)',
}}>
  <div style={{ position: 'absolute', inset: 7, borderRadius: 4, background: 'var(--bg)' }} />
</div>
```

**Supabase nested join type casting** — PostgREST infers joined relations as arrays. Always cast through `unknown`:
```typescript
// ✅ Correct
const org = invite.organisations as unknown as { name: string } | null
// ❌ Wrong — TypeScript error
const org = invite.organisations as { name: string } | null
```

### Core Layout

The app uses a two-panel layout:

```
┌──────────────────────────────────────────────────────┐
│  Sidebar (210px fixed)  │  Main Content (flex: 1)    │
│  ─────────────────────  │  ──────────────────────    │
│  Brand + Org Switcher   │  Topbar                    │
│  ─────────────────────  │  ──────────────────────    │
│  Nav sections           │  Page content              │
│  (scrollable)           │  (scrollable independently)│
│  ─────────────────────  │                            │
│  User profile (bottom)  │                            │
└──────────────────────────────────────────────────────┘
```

### Sidebar — Exact Structure

Width: 210px, fixed, never collapses on desktop.
Background: `bg-gray-50 dark:bg-gray-900`, right border `border-r border-gray-200 dark:border-gray-700`.

**Top — Brand + Org Switcher:**
- Brand row: 26px dark icon square (border-radius 6px) with building icon + "PropFlow" 14px/500
- Org switcher: white card with org name 12px/500, type 10px muted, chevron-right icon. Clicking opens org list.

**Navigation sections in this exact order:**
```
OVERVIEW
  Dashboard                    icon: ti-layout-dashboard

PORTFOLIO
  Properties                   icon: ti-building-estate
  Tenancies                    icon: ti-file-text
  Tenants                      icon: ti-users

FINANCE
  Rent Ledger        [badge]   icon: ti-coin-pound   badge = overdue count

OPERATIONS
  Compliance         [badge]   icon: ti-shield-check  badge = alert count
  Maintenance                  icon: ti-tool

ORGANISATION
  Team                         icon: ti-users-group
  Settings                     icon: ti-settings
```

Section labels: 10px, uppercase, `tracking-wider`, muted, padding `8px 14px 3px`.
Nav items: 12px, padding `7px 10px`, margin `1px 6px`, border-radius 6px.
- Default: muted text, transparent bg
- Hover: `bg-white dark:bg-gray-800`, primary text
- Active: `bg-white dark:bg-gray-800`, primary text, font-weight 500
- Alert badges: `bg-red-500 text-white` pill, 10px, right side of item

Use Framer Motion `layoutId` on the active nav background for a smooth sliding indicator.

**Bottom — User profile:**
- Avatar: 28px circle, initials, `bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300`
- Name: 11px/500, Role: 10px muted
- Top border separating from nav

### Topbar — Exact Structure

Height ~48px, `border-b border-gray-200 dark:border-gray-700`, padding `px-6 py-3`.

Left side: page title (15px/500) + page subtitle (11px, muted, below title).
Right side: notification bell icon button + primary action button.

Every page must have a subtitle giving useful context. Examples:
- Dashboard: "Good morning, [name] — here's your portfolio at a glance"
- Properties: "3 properties · 5 units · 1 void"
- Tenancies: "5 tenancies · 3 expiring within 60 days"
- Rent Ledger: "May 2026 · £7,250 collected of £8,450"

Primary action buttons per page:
| Page | Button label |
|---|---|
| Dashboard | (none) |
| Properties | Add Property |
| Tenancies | New Tenancy |
| Tenants | Add Tenant |
| Rent Ledger | Record Payment |
| Compliance | Add Certificate |
| Maintenance | Log Issue |
| Team | Invite Member |
| Settings | Save Changes |

### Animations — Framer Motion

Apply to every page and list. This is what makes the app feel fluid.

**Page transition** — wrap every page's content in this:
```typescript
const pageVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } }
}
// <motion.div variants={pageVariants} initial="hidden" animate="visible">
```

**List stagger** — wrap table rows and card grids in this:
```typescript
const containerVariants = {
  visible: { transition: { staggerChildren: 0.04 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 3 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } }
}
// <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
// <motion.tr variants={itemVariants}>
```

**KPI cards** — animate value from 0 to final number on mount using a `useCountUp` hook.

**Alert banner** — slide down on mount:
```typescript
initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
transition={{ duration: 0.2 }}
```

**Card hover** — CSS only, no Framer Motion needed:
```css
transition: border-color 150ms ease;
```

### Status Colour System

Use these exact Tailwind classes everywhere. Never deviate or invent new badge styles.

| Status | Light mode badge | Dark mode badge | Used for |
|---|---|---|---|
| Active / Paid / Valid / Confirmed | `bg-emerald-50 text-emerald-800` | `dark:bg-emerald-900/30 dark:text-emerald-400` | Active tenancy, paid rent, valid cert |
| Expiring / Partial / Warning | `bg-amber-50 text-amber-800` | `dark:bg-amber-900/30 dark:text-amber-400` | Expiring tenancy, part payment, cert due soon |
| Overdue / Urgent / Danger | `bg-red-50 text-red-800` | `dark:bg-red-900/30 dark:text-red-400` | Overdue rent, urgent compliance |
| In Progress / Scheduled / Periodic | `bg-blue-50 text-blue-800` | `dark:bg-blue-900/30 dark:text-blue-400` | Work in progress, periodic tenancy |
| Void / Open / Neutral | `bg-gray-100 text-gray-600` | `dark:bg-gray-800 dark:text-gray-400` | Void unit, open issue |

Compliance dots: 7px circle. Red = `bg-red-500`, Amber = `bg-amber-500`, Green = `bg-emerald-500`.
Occupancy bars: 4px height, rounded. Green = 100% occupied, amber = partial, no fill = void.

### Component Tokens

```
Border radius:
  Buttons, badges, inputs, nav items: rounded (6px)
  Cards, panels: rounded-lg (8px)
  Modals, large sections: rounded-xl (12px)

Borders:
  Standard: border border-gray-200 dark:border-gray-700
  Muted row dividers: border-b border-gray-100 dark:border-gray-800
  Dashed add cards: border-dashed border-gray-300 dark:border-gray-600

Cards:
  Standard: bg-white dark:bg-gray-800, border, rounded-lg, p-4
  KPI: bg-gray-50 dark:bg-gray-800/50, no border, rounded-lg, p-3
  Dashed add: centered content, muted icon + label

Tables:
  No outer border on table element itself
  Header: text-[10px] font-medium text-gray-500 uppercase tracking-wider, border-b
  Rows: text-xs, border-b border-gray-100 dark:border-gray-800, last row no border
  Cell padding: py-2.5 (vertical), no horizontal padding on first/last cell
  Hover row: bg-gray-50/50 dark:bg-gray-800/50

Buttons:
  Default: border border-gray-200 dark:border-gray-700, bg-white dark:bg-gray-800, text-sm
  Primary: bg-gray-900 dark:bg-white, text-white dark:text-gray-900, no border
  Icon only: same as default, square aspect, no label text
  Danger: border-red-200, text-red-600, hover:bg-red-50

Typography:
  Page title: text-[15px] font-medium
  Section heading: text-[13px] font-medium
  Body / table: text-xs (11-12px)
  Muted labels: text-[10px] font-medium text-gray-500 uppercase tracking-wider
  KPI values: text-[22px] font-medium
  KPI sub: text-[10px] text-gray-500
  Monospaced: font-mono for reference numbers, amounts, dates
```

### Alert Banner

Show at top of Dashboard (and Compliance page) when urgent compliance issues exist.

```
bg-amber-50 dark:bg-amber-900/20
border border-amber-200 dark:border-amber-800
text-amber-900 dark:text-amber-300
rounded-lg p-3 mb-4 flex items-center gap-3 text-[11px]

⚠️ icon left | message text centre | "View →" link right (cursor-pointer)
```

Animate in with slide-down when present, not at all when absent.

### KPI Card Grid

Always 4 columns on dashboard. Use grid-cols-4 gap-3.
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Label 11px   │ │              │ │              │ │              │
│              │ │              │ │              │ │              │
│ £8,450       │ │ £1,200       │ │ 1            │ │ 3            │
│ 22px/500     │ │ red 22px/500 │ │ 22px/500     │ │ amber 22px   │
│              │ │              │ │              │ │              │
│ sub 10px     │ │ sub red      │ │ sub amber    │ │ sub          │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

## Frontend Build — Page Specifications

Build pages in this exact order. Complete each one fully before moving to the next.

### Phase 1 — App Shell (START HERE)

1. **`/lib/mock-data.ts`** — Realistic mock data for all entities. Must match DB schema field names exactly. Include: 3 properties, 5 units, 5 tenants, 5 tenancies, rent records, 5 compliance certificates, 3 maintenance issues, 3 team members.

2. **`/components/layout/Sidebar.tsx`** — Full sidebar per spec above. Accept `currentPage` and `onNavigate` props. Show role-appropriate nav items (default to owner role for now).

3. **`/components/layout/Topbar.tsx`** — Accept `title`, `subtitle`, `action` (optional) props. Render notification bell + action button.

4. **`/components/layout/PageWrapper.tsx`** — Wraps children in Framer Motion page transition. Export as default.

5. **`/components/layout/AppShell.tsx`** — Combines Sidebar + main column (Topbar + scrollable content). This is the root layout wrapper for all dashboard pages.

### Phase 2 — Dashboard

6. **`/app/(dashboard)/[orgSlug]/dashboard/page.tsx`**
   - Import mock data
   - Alert banner (conditional — show when compliance alerts exist)
   - 4 KPI cards in grid: Monthly Rent Roll, Arrears, Void Units, Expiring Tenancies
   - Two-column lower section:
     - Left: Rent collection progress bar + overdue payments table
     - Right: Compliance alerts panel + upcoming renewals table
   - All list items animated with stagger

### Phase 3 — Core Modules

7. **Properties page** — 2-col card grid. Each card: property name, address, type, status badge, occupancy bar, monthly rent, net yield, purchase date. Dashed "Add property" card at end.

8. **Tenancies page** — Filter tabs (All / Active / Expiring / Periodic / Ended) + table with: tenant name, property/unit, rent, start, end (highlighted red/amber if expiring), status badge, deposit badge.

9. **Tenants page** — Table with: avatar initials + name, email, current tenancy, right-to-rent badge, active badge.

10. **Rent Ledger page** — 3 KPI cards (Total Due, Collected, Outstanding) + table with: tenant, property, due, paid, balance, status badge.

11. **Compliance page** — Alert banner when urgent + table with: certificate type, property, issued date, expiry date (coloured if near), days-remaining badge, status badge.

12. **Maintenance page** — Table with: issue title + source (subtext), property, reported date, priority badge, status badge.

13. **Team page** — Table with: avatar + name, role badge, email, joined date, status badge. Invite Member button in topbar.

14. **Settings page** — Two cards: (1) org details form (name, type, email), (2) subscription card showing current plan + Upgrade button.

---

## Frontend Build — Current Status

Update this table after completing each task.

| Task | Status |
|---|---|
| Next.js project scaffolded | ✅ Complete |
| CLAUDE.md created and maintained | ✅ Complete |
| UI mockup reviewed and design approved | ✅ Complete |
| Migrations 001–004 built and running | ✅ Complete |
| Migrations 005–007 written (need running in Supabase) | ✅ Complete |
| Mock data file `/lib/mock-data.ts` | ✅ Complete |
| Sidebar component | ✅ Complete |
| Mobile slide-out menu (`StaggeredMenu.tsx`) | ❌ Deleted — removed entirely this session |
| Topbar component | ✅ Complete |
| PageWrapper component | ✅ Complete |
| AppShell layout | ✅ Complete |
| Dashboard page (mock data) | ✅ Complete |
| Properties page (real Supabase data) | ✅ Complete |
| Tenancies page (real Supabase data) | ✅ Complete |
| Tenants page (real Supabase data) | ✅ Complete |
| Rent Ledger page (real Supabase data) | ✅ Complete |
| Compliance page (real Supabase data) | ✅ Complete |
| Maintenance page — Crystal Kanban board (real Supabase data) | ✅ Complete |
| Team page — Crystal styling, invite modal via API | ✅ Complete |
| Settings page | 🔜 Pending |
| Auth pages — login, signup (Crystal design) | ✅ Complete |
| Onboarding page (Crystal design) | ✅ Complete |
| Admin Supabase client (`/lib/supabase/admin.ts`) | ✅ Complete |
| Email invite system (`/api/team/invite`) via Resend | ✅ Complete |
| Invite acceptance API (`/api/team/invite/accept`) | ✅ Complete |
| Invite page (`/invite/[token]`) — server + client components | ✅ Complete |
| Login/signup `?next=` redirect param support | ✅ Complete |
| Login loop bug (Vercel + iOS Safari) | ✅ Fixed — native form POST + 303 redirect |
| Login speed (org slug resolved in route handler) | ✅ Fixed — skips /dashboard relay, 2 fewer Supabase calls |
| Supabase auth integration | ✅ Complete (all browsers + Vercel) |
| Org data caching — `OrgDataProvider` + `layout.tsx` | ✅ Complete — single fetch on entry, instant tab switching |
| Sidebar flicker on tab switch | ✅ Fixed — shell data in context, AppShell no longer re-fetches |
| `CrystalSelect` — custom dropdown component | ✅ Complete — replaces all native `<select>` in modals |
| `CrystalDatePicker` — custom calendar component | ✅ Complete — replaces all native `<input type="date">` in modals |
| Wire up live badge counts in AppShell | 🔜 Pending |
| Replace mock data in Dashboard page with real Supabase queries | 🔜 Pending |
| Settings page | 🔜 Pending |
| Deploy to Vercel | ✅ Live at https://property-manager-orpin.vercel.app |

---

## Multi-Tenancy Model

**One user account → many organisations.**

A user signs up once with their email. They create their first organisation during onboarding. Later, they can create or join additional organisations — all under the same login. They switch between organisations using an org-switcher in the sidebar.

**Each organisation is completely isolated.** A user in Org A can never see, read, or affect data in Org B. This is enforced at the database level via Row Level Security (RLS) — not just in application code.

### Org Hierarchy
```
Organisation
  └── Properties
        └── Units
              └── Tenancies
                    └── Tenants
                    └── Charges / Rent Schedule
                    └── Payments
```

---

## Organisation Types

The platform is designed to support multiple portfolio types. Currently active: **Buy to Let**.

| Slug | Label |
|---|---|
| `buy_to_let` | Buy to Let |
| `hmo` | HMO |
| `serviced_accommodation` | Serviced Accommodation |
| `holiday_let` | Holiday Let |
| `commercial` | Commercial |
| `mixed_portfolio` | Mixed Portfolio |

Organisation type is stored in a lookup table (`organisation_types`) and referenced by `organisations.organisation_type_id`. Adding a new type requires only a new database row — no code changes.

---

## Roles & Permissions

Every user has a role **per organisation**. A user can be an `owner` in one org and a `viewer` in another.

| Role | Slug | What They Can Do |
|---|---|---|
| Owner / Admin | `owner` | Full access. Billing, team, all data, all settings |
| Manager | `manager` | Properties, tenancies, maintenance, tasks, financials |
| Accountant | `accountant` | Read-only financials. Can manage invoices and payments |
| Staff | `staff` | Assigned tasks and relevant property information |
| Maintenance | `maintenance` | View and update maintenance issues and work orders |
| Cleaner | `cleaner` | View and complete assigned cleaning tasks only |
| Viewer | `viewer` | Read-only access across the organisation |

### Role Enforcement Rules
- `owner` and `manager` are treated as **admins** — they can do most things
- `owner` is the only role that can: delete the organisation, change billing, remove other owners
- `cleaner` sees a stripped-down mobile-first task interface — not the full dashboard
- `maintenance` sees only the maintenance module and assigned work orders
- `accountant` sees financial data but cannot create/edit tenancies or properties
- `viewer` has no write access anywhere — hide all action buttons
- RLS helper functions (`is_org_member`, `is_org_admin`, `is_org_owner`) enforce this at the DB level

### Sidebar Nav Visibility by Role

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

Cleaner role gets a separate simplified interface showing only their assigned tasks for the day.

---

## Database — Key Conventions

### Always follow these rules:
- Every table has `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
- Every table has `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Every table with mutable data has `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` with trigger
- Every table that belongs to an org has an `org_id` column (or reaches org via a foreign key join)
- RLS is enabled on **every** table — no exceptions
- All migrations are numbered sequentially: `001_foundation.sql`, `002_properties.sql`, etc.
- Each migration file is self-contained and can be run independently in order
- Foreign keys use `ON DELETE CASCADE` for child data, `ON DELETE RESTRICT` for critical references

### Naming Conventions
- Tables: `snake_case`, plural (e.g. `properties`, `tenancies`, `rent_payments`)
- Columns: `snake_case` (e.g. `first_name`, `org_id`, `is_active`)
- Indexes: `idx_[table]_[column]` (e.g. `idx_properties_org_id`)
- Triggers: `trg_[table]_[action]` (e.g. `trg_organisations_updated_at`)
- RLS policies: descriptive plain English (e.g. `"Org members can view properties"`)
- Functions: `snake_case` verbs (e.g. `is_org_member()`, `handle_new_user()`)

---

## Database — Migration Order

Migrations must be run in order. Never skip. Never run out of sequence.

| File | Status | Contents |
|---|---|---|
| `001_foundation.sql` | ✅ Complete & running in Supabase | Extensions, org types, organisations, roles, profiles, org_members, invitations, RLS helper functions |
| `002_properties.sql` | ✅ Complete & running in Supabase | property_types, properties, unit_types, amenities, units, unit_amenities |
| `003_tenants.sql` | ✅ Complete & running in Supabase | tenants (Right to Rent tracking), guarantors, tenant_references, tenant_documents |
| `004_tenancies.sql` | ✅ Complete & running in Supabase | tenancies, tenancy_tenants, tenancy_renewals, tenancy_terminations, tenancy_documents |
| `005_rent.sql` | ✅ Complete & running in Supabase | rent_schedules, charges, payments, payment_allocations, security_deposits, arrears_log |
| `006_maintenance.sql` | ✅ Complete & running in Supabase | issues, work_orders, work_order_notes, vendors |
| `007_compliance.sql` | ✅ Complete & running in Supabase | certificates, hmo_licences, inspections, inspection_items |
| `008_tasks.sql` | 🔜 Pending | tasks, task_assignments |
| `009_documents.sql` | 🔜 Pending | documents (polymorphic — links to any entity) |
| `010_notifications.sql` | 🔜 Pending | notifications, audit_log |
| `011_reporting.sql` | 🔜 Pending | occupancy_snapshots, financial_summaries, portfolio_valuations |

---

## What Has Been Built So Far

### ✅ `001_foundation.sql` — Complete & running in Supabase
- `uuid-ossp` and `pgcrypto` extensions
- `organisation_types` lookup table (seeded with 6 types)
- `organisations` table
- `roles` table (seeded with 7 roles)
- `profiles` table (personal info, auto-created on signup via trigger)
- `organisation_members` table (links users to orgs with a role)
- `organisation_invitations` table (secure token-based invites)
- `update_updated_at()` trigger function (reused across all tables)
- `handle_new_user()` trigger (auto-creates profile on auth.users insert)
- RLS policies use inline subqueries on `profiles` table — pattern: `org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND is_active = true)`. No separate helper functions were created.
- Full RLS policies on all tables + all indexes

### ✅ `002_properties.sql` — Complete & running in Supabase
- `property_types` lookup table (seeded with 11 types: terraced, semi-detached, flat, HMO, etc.)
- `properties` table (UK address fields, financial fields, mortgage tracking)
- `unit_types` lookup table (seeded with 9 types: studio, 1-bed, room, whole house, etc.)
- `amenities` lookup table (seeded with 20 amenities across 5 categories)
- `units` table (org_id denormalised from properties for RLS performance)
- `unit_amenities` junction table
- `sync_unit_org_id()` trigger — keeps units.org_id in sync with properties.org_id automatically
- Full RLS policies + all indexes

### ✅ `003_tenants.sql` — Complete & running in Supabase
- `tenants` table (personal details, identity, Right to Rent status/expiry, pre-tenancy address, emergency contact)
- `guarantors` table (org_id auto-synced from tenants via trigger, financial vetting fields)
- `tenant_references` table (employment, previous landlord, credit check, character — status lifecycle tracked)
- `tenant_documents` table (passport, BRP, visa, right to rent share code, credit reports — with expiry tracking)
- `sync_guarantor_org_id()` trigger
- Full RLS policies + all indexes (including right_to_rent_expiry for compliance alerts)

### ✅ `004_tenancies.sql` — Complete & running in Supabase
- `tenancies` table (type, status lifecycle, rent terms, deposit fields with Housing Act 2004 tracking)
- `tenancy_tenants` junction table (joint tenancy support, is_lead flag)
- `tenancy_renewals` table (append-only renewal history, before/after rent and dates)
- `tenancy_terminations` table (S21, S8, mutual surrender, abandonment — ON DELETE RESTRICT to protect audit trail)
- `tenancy_documents` table (AST, S21/S8 notices, How to Rent, inventory)
- `sync_tenancy_org_id()` trigger
- Full RLS policies + all indexes

### ✅ Dashboard page — Complete (mock data)
- Alert banner (slide-down animation, conditional on expired compliance certs)
- 4 KPI cards with `useCountUp` hook animating values on mount: Monthly Rent Roll £4,850, Arrears £3,200, Void Units 1, Expiring Soon 2
- Rent Collection panel (left): May 2026 stats (£3,250 collected of £4,850), animated progress bar, overdue payments table with stagger
- Compliance Alerts panel (right): expired/expiring certs with coloured dot badges
- Upcoming Renewals table (right): ten-001 (46d left, amber) + ten-003 (periodic, blue)
- All tables use Framer Motion stagger animation on rows
- **Still uses mock data** — needs wiring up to real Supabase queries

### ✅ Properties page — Complete (real Supabase data)
- 2-col card grid with property name, address, type badge, occupancy bar, rent, yield, purchase date
- Dashed "Add Property" card at end
- `AddPropertyModal`: address fields, property type dropdown, purchase price, current value, monthly rent, mortgage fields; inserts without `.select()` (see Supabase insert pattern below)

### ✅ Tenancies page — Complete (real Supabase data)
- Filter tabs (All / Active / Expiring / Periodic / Ended) with amber badge count on Expiring tab
- Query: `tenancies` with nested `units(unit_ref, properties(name))` and `tenancy_tenants(is_lead, tenants(first_name, last_name))`
- `EndDateCell`: colors date red (<30d) or amber (<60d), shows day countdown
- `DepositBadge`: Protected (emerald) if `deposit_registered_date` set, Unprotected (red) if not
- Dynamic subtitle: `"X active · Y expiring within 60 days"`

### ✅ Tenants page — Complete (real Supabase data)
- Table: avatar initials + name, email, current tenancy (property/unit), right-to-rent badge, active badge
- `RightToRentBadge`: unlimited=emerald "UK/Settled", time_limited=amber (with days countdown if within 90d), not_checked/failed=red
- `currentTenancy()`: finds first tenancy with status active/periodic/in_notice

### ✅ Rent Ledger page — Complete (real Supabase data)
- 3 KPI cards: Total Due, Collected (emerald), Outstanding (red if >0)
- Month navigation with prev/next arrows; future months disabled
- `RecordPaymentModal`: tenancy selector, amount, date, method, reference; inserts payment then auto-allocates to oldest outstanding charges
- Dynamic subtitle: `"May 2026 · £X collected of £Y"`

### ✅ Compliance page — Complete (real Supabase data)
- Alert banner (AnimatePresence slide-down) when expired + expiring certs exist
- Table sorted by expiry_date ascending (most urgent first)
- `StatusDot`: 7px circle, red/amber/green
- `DaysRemainingBadge`: red badge if <30d or overdue, amber if <90d
- `AddCertModal`: type dropdown, property, issued date, expiry date (optional), reference, issued by, notes
- Status is auto-computed by DB trigger — never set manually from frontend

### ✅ Maintenance page — Crystal Kanban board (real Supabase data)
- 4-column Kanban: Open (rose), Scheduled (indigo), In Progress (amber), Completed (mint)
- `IssueCard`: left border coloured by priority, glassmorphism card, `layoutId={issue.id}` for Framer Motion shared-layout animation on status change
- `StatusDropdown`: "Move" button with AnimatePresence dropdown; optimistic UI update via `updateIssueStatus()` from `useOrgData()`
- `KanbanColumn`: stagger variants, empty dashed placeholder when no cards
- `LogIssueModal`: uses `CrystalSelect` and `CrystalDatePicker`

### ❌ StaggeredMenu (mobile sidebar) — DELETED this session
- The mobile hamburger menu and `StaggeredMenu.tsx` component have been completely removed
- `AppShell.tsx` and `Topbar.tsx` have been cleaned up — no remnants remain
- Mobile navigation is a known issue to address separately in a future session

### ✅ Auth pages — Crystal design (login, signup, onboarding)
- **Login page** (`/login`): Crystal glassmorphism card, conic-gradient brand mark, `.crystal-input` fields, password toggle, indigo gradient submit, `?next=` param support for post-login redirect
- **Signup page** (`/signup`): Same Crystal styling, 2-column name grid, `AnimatePresence` for form ↔ email-sent confirmation transition, `?next=` param threads through `emailRedirectTo` to auth callback
- **Onboarding page** (`/onboarding`): 2-step progress indicator (Account ✓ mint → Organisation indigo active), portfolio type grid (6 buttons with indigo active state), org creation logic unchanged
- All auth logic unchanged — only visual layer restyled

### ✅ Team page — Crystal styling (real Supabase data)
- Members table: gradient avatar with initials (indigo→cyan), name, role badge, joined date (mono font), status badge
- Invitations table: email, role, sent date, expiry (rose if expired), status badge, cancel button (trash icon, rose hover)
- `RoleBadge`: owner=indigo, manager=cyan, accountant=mint, maintenance=amber, others=void
- `InviteStatusBadge`: accepted=healthy, expired=arrears, pending=warn dot
- `handleCancelInvite`: optimistic remove + `supabase.from('invitations').delete().eq('id', id)`
- `InviteMemberModal`: calls `/api/team/invite` POST (sends real email via Resend) — not direct DB insert
- Dynamic subtitle: `"X members · Y active · Z pending invites"`

### ✅ Email invite system — Complete
- **`/lib/supabase/admin.ts`** — service role client; server-only; bypasses RLS; never import in client components
- **`/api/team/invite/route.ts`** — POST: authenticates caller, verifies owner/manager role, generates `randomBytes(32).toString('hex')` token, inserts to `invitations`, sends dark-themed HTML email via Resend; rolls back invite row if email fails
- **`/api/team/invite/accept/route.ts`** — POST `{ token }`: requires authenticated user, validates token (not expired/accepted), checks if already a member, creates `profiles` row from auth metadata, marks `invitations.accepted_at`, returns `{ orgSlug }` for redirect
- **`/invite/[token]/page.tsx`** — Server component; uses admin client to fetch invite + org + role + inviter name server-side (bypasses RLS for unauthenticated token validation); handles 4 states: invalid, expired, already accepted, valid
- **`/invite/[token]/InviteAcceptCard.tsx`** — Client component; checks `supabase.auth.getUser()` on mount; authenticated → "Accept invitation" button → POST accept API → redirect to org dashboard; unauthenticated → "Sign in to accept" (`/login?next=/invite/[token]`) + "Create account" (`/signup?next=/invite/[token]`)
- **Resend free tier note**: `from: 'PropFlow <onboarding@resend.dev>'` only delivers to the Resend account owner's email in development. For sending to any email, a custom verified domain must be configured in Resend and the `from` address updated.

### ✅ `005_rent.sql` — Complete & running in Supabase
- `rent_schedules`, `charges`, `payments`, `payment_allocations`, `arrears_log`
- `charges.paid_amount` stored/denormalised; trigger `refresh_charge_paid_amount()` recomputes after any `payment_allocations` INSERT/UPDATE/DELETE, auto-sets charge status
- `sync_charge_org_id()` and `sync_payment_org_id()` triggers

### ✅ `006_maintenance.sql` — Complete & running in Supabase
- `vendors`, `issues`, `work_orders`, `work_order_notes`
- `issues.priority`: emergency/urgent/high/medium/low; `issues.source`: tenant/manager/inspection/routine/other

### ✅ `007_compliance.sql` — Complete & running in Supabase
- `certificates`, `hmo_licences`, `inspections`, `inspection_items`
- `compute_certificate_status()` trigger: auto-sets status from expiry_date (expired/expiring_soon/valid/no_expiry); threshold = 90 days

### ✅ Login bug fix — Complete (this session)
- Root cause: `fetch()` with `redirect: 'manual'` does not commit `Set-Cookie` headers before the browser navigates, causing the middleware to see no session and redirect back to `/login`
- Fix 1: Login form changed to native `<form method="POST" action="/api/auth/login">` — browser commits cookies synchronously before the GET to `/dashboard`
- Fix 2: Route handler now accepts `application/x-www-form-urlencoded`, returns **303 See Other** (not 307) so the browser converts the POST to a GET on redirect
- Fix 3: Middleware updated so `/api/auth/` routes are in `isPublic` — unauthenticated POSTs to the login handler are no longer intercepted

### ✅ Login performance — Complete (this session)
- Route handler now resolves the org slug after `signInWithPassword` and redirects directly to `/{orgSlug}/dashboard`, skipping the `/dashboard` server component relay
- Eliminates one full HTTP round trip and 3 serial Supabase calls (org name lookup, profile query, org type) from the login critical path

### ✅ Org data caching — Complete (this session)
- `src/lib/org-data-context.tsx` — `OrgDataProvider` client component; bootstraps by resolving org slug → org id → fetches all page data in a single `Promise.all` (10 parallel Supabase queries); persists for the full session
- `src/app/(dashboard)/[orgSlug]/layout.tsx` — wraps all org pages with `OrgDataProvider`; never re-mounts on tab navigation
- All 7 dashboard pages (properties, tenants, tenancies, rent, compliance, maintenance, team) rewritten to read from `useOrgData()` instead of their own `useEffect`/`load` pattern
- Rent page month switching now filters the cached charge array in memory — no network call on month change
- Context also fetches org name, org type, and current user profile for the sidebar — eliminates the separate AppShell fetch

### ✅ Sidebar flicker fix — Complete (this session)
- `AppShell` previously rendered inside each page and re-fetched org/user data on every mount (4 serial Supabase calls per tab switch)
- Fix: `AppShell` now reads `orgName`, `orgTypeLabel`, and `currentUser` from `useOrgData()`; the context (in the persistent layout) fetches this data once and it never changes on navigation
- Result: sidebar org name and user info are stable across all tab switches — no flicker, no "Loading…" placeholder

### ✅ `CrystalSelect` — Complete (this session)
- `src/components/ui/CrystalSelect.tsx` — custom dropdown replacing all native `<select className="crystal-select">` elements
- Portal-rendered into `document.body` with `position: fixed` — always appears above modal `overflow: auto` containers
- Auto-flips upward when there is insufficient space below the trigger
- Glassmorphism panel: `var(--surface)` + blur(20px) + deep shadow; indigo check on selected option; animated chevron
- Trigger matches `crystal-input` styling exactly (same border, focus ring, padding)
- Closes on outside click, Escape key, or option selection
- All 10 `<select>` elements replaced: properties, compliance, maintenance (×4), team, rent (×2)

### ✅ `CrystalDatePicker` — Complete (this session)
- `src/components/ui/CrystalDatePicker.tsx` — custom calendar replacing all native `<input type="date">` elements
- Same portal + auto-flip architecture as `CrystalSelect`
- Hand-built Monday-start UK calendar grid (42-cell, 6-row layout) with prev/next month fill shown muted
- Selected day: indigo gradient background + glow shadow; today: indigo outline ring + indigo text
- Trigger: `display: block` with absolutely-positioned icon — height matches `crystal-input` exactly in grid layouts
- Calendar icon in `var(--text-mute)` (previously browser-native black in dark mode)
- Placeholder text in `var(--text-mute)` (consistent with all other inputs)
- Display value in `var(--font-mono)` UK format (DD/MM/YYYY); stores in ISO (YYYY-MM-DD)
- Today shortcut button at bottom of calendar
- All 6 `<input type="date">` elements replaced: properties, compliance (issued + expiry), maintenance, rent

---

## Supabase Data Patterns (Critical — Read Before Writing Any Query)

### INSERT without .select()
**Never chain `.select()` after an INSERT.** PostgREST applies the SELECT RLS policy against the RETURNING clause, which will fail if the policy uses `get_my_org_ids()` and the row isn't yet committed. Always insert, then refetch if you need the new row.

```typescript
// ✅ Correct
await supabase.from('certificates').insert({ ... })
await fetchData() // refetch separately

// ❌ Wrong — will fail with RLS error
const { data } = await supabase.from('certificates').insert({ ... }).select()
```

### RLS pattern
All tables use `get_my_org_ids()` (SECURITY DEFINER function) for SELECT policies:
```sql
USING (org_id IN (SELECT get_my_org_ids()))
```
INSERT/UPDATE policies use an inline subquery checking `profiles` + `roles`.

### Nested queries
Use PostgREST's nested select syntax for related data:
```typescript
supabase.from('tenancies')
  .select(`*, units(unit_ref, properties(name)), tenancy_tenants(is_lead, tenants(first_name, last_name))`)
```

---

## Known Issues — Next Session Priorities

### 🔜 PRIORITY 1: Replace Dashboard mock data with real Supabase queries
The dashboard page (`/[orgSlug]/dashboard/page.tsx`) still uses hardcoded values from `mock-data.ts`. Now that `OrgDataContext` caches all org data, the dashboard should read from `useOrgData()` like all other pages:
- Monthly rent roll: derive from `charges` (sum of amounts due this month)
- Arrears: derive from `charges` (sum of overdue amounts)
- Void units: derive from `properties` → `units` (count units with status `vacant`)
- Expiring tenancies: derive from `tenancies` (count expiring within 60 days)
- Compliance alerts panel: read from `certs` (filter expired/expiring_soon)
- Upcoming renewals: read from `tenancies` (filter active with end_date within 90 days)
- Overdue payments table: read from `charges` (filter overdue, join tenant/property)

### 🔜 PRIORITY 2: Wire up live badge counts in AppShell
`AppShell` passes `badges={{ rent: 0, compliance: 0 }}` hardcoded. These should be derived from the cached context data (no extra queries needed):
- `rent` badge = `charges.filter(c => c.status === 'overdue').length`
- `compliance` badge = `certs.filter(c => c.status === 'expired' || c.status === 'expiring_soon').length`

### 🔜 PRIORITY 3: Settings page
Two cards: (1) org details form (name, type, contact email) — reads/updates `organisations` table; (2) subscription card showing current `plan` column + Upgrade button (links to Stripe Checkout later). Use `CrystalSelect` for the org type dropdown.

### 🔜 PRIORITY 4: Mobile navigation
The mobile hamburger menu (`StaggeredMenu.tsx`) was deleted in a previous session. Mobile navigation is unaddressed. The app is currently desktop-only. A future session should design a mobile-first nav approach consistent with the Crystal design system.

### 🔜 PRIORITY 5: Migrations 008–011
- `008_tasks.sql` — tasks, task_assignments (needed for staff/cleaner role task view)
- `009_documents.sql` — documents (polymorphic, links to any entity)
- `010_notifications.sql` — notifications, audit_log
- `011_reporting.sql` — occupancy_snapshots, financial_summaries, portfolio_valuations

---

## Key Business Logic (BTL-Specific)

### Tenancies
- UK Assured Shorthold Tenancy (AST) is the standard agreement type
- Tenancies have: start date, end date, break clause, notice period, rent amount, rent frequency, status
- Status flow: `active` → `periodic` (month-to-month after end date) → `in_notice` → `ended`
- A tenancy rolling into periodic without renewal must trigger an alert
- Joint tenancies are supported — multiple tenants per tenancy via `tenancy_tenants` junction table

### Rent Collection
- `rent_schedules` defines what is owed and when (monthly, weekly, etc.)
- `charges` are generated from the schedule (one row per expected payment)
- `payments` record money received
- `payment_allocations` maps a payment to specific charges
- Arrears = sum of unpaid charges past their due date
- Arrears must be visible on the dashboard as a headline metric

### Compliance (Critical — Legal Obligations)
- Gas Safety Certificate: annual, mandatory. Missing = £6,000 fine, cannot serve notice
- EICR: every 5 years
- EPC: every 10 years. Must be E or above for new tenancies
- Deposit protection: must be registered within 30 days of receipt
- Alerts must fire at 90, 60, and 30 days before any certificate expiry
- HMO licences tracked separately (not all properties are HMOs)

### Deposits
- Protected in a government scheme: TDS, DPS, or myDeposits
- Track: amount, scheme name, scheme reference number, protection date
- Flag any deposit not protected within 30 days as non-compliant

### Dashboard KPIs (BTL Owner's Primary Metrics)
1. Monthly rent roll (total rent due this month)
2. Arrears (total overdue, number of tenants)
3. Void units (empty units as % of portfolio)
4. Upcoming renewals (tenancies expiring in 30/60/90 days)
5. Compliance alerts (certs expiring soon)
6. Net cash flow (rent collected minus mortgage costs)

---

## Subscription / Billing

The `organisations` table has a `plan` column: `free`, `starter`, `pro`, `enterprise`.

Billing flow:
1. New org defaults to `free`
2. User upgrades via Stripe Checkout
3. Stripe fires a webhook to a Supabase Edge Function
4. Edge Function updates `organisations.plan`
5. Frontend gates features based on `plan` value

The database schema does not need to change to add billing — the `plan` column is already there.

---

## Auth Flow

- **Public signup** → user creates account → immediately prompted to create their first organisation → becomes `owner` of that org → profile auto-created by DB trigger
- **Staff invitation** → owner/manager enters email + selects role → invitation row created with secure token → email sent → recipient clicks link → signs up or logs in → profile + org_member row created → invitation marked accepted
- **Org switching** → user can belong to multiple orgs → org switcher in sidebar shows all their orgs → switching updates the active org context in the session
- **No public staff registration** — staff can only join via invitation

---

## Instructions for Claude Code

- **Always read this file at the start of every session**
- **Never change the tech stack** — Next.js, Supabase, Tailwind, Framer Motion, TypeScript, Stripe
- **Never skip migrations** — always build the next numbered SQL file before writing frontend code that depends on it
- **Always use TypeScript** — no plain `.js` files, no `any` types
- **Always apply RLS** — every new table needs RLS enabled and policies written
- **Always add indexes** — on every `org_id`, `user_id`, foreign key, and frequently filtered column
- **Always add `updated_at` triggers** — on every table that has an `updated_at` column
- **Follow naming conventions** — see Database Conventions section above
- **Dark mode always** — every component must work in both light and dark mode using `dark:` Tailwind classes
- **Role-aware always** — check user role before rendering any sensitive UI element or action button
- **UK-first** — dates in DD/MM/YYYY, currency in GBP (£), addresses use UK postcode format
- **Ask before adding new dependencies** — do not install packages not listed in the tech stack without confirming first
- **Mock data first** — build all pages with mock data from `/lib/mock-data.ts` before wiring up any Supabase queries
- **Match the approved design exactly** — use the Design System section above. Do not invent new component patterns
- **Framer Motion on every page** — page transition on every route, stagger animation on every list and table
- **Status colours are fixed** — always use the exact Tailwind badge classes defined in the Status Colour System
- **Update this file** — after completing each task, mark it ✅ in the Frontend Build Status table and add detail to What Has Been Built So Far
