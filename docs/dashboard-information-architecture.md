# TapTapToGo Dashboard Information Architecture

## Site Map

- `/` → Dashboard (default landing page)
- `/card-management` → Card Management
- `/ticket-shop` → Ticket Shop
- `/transactions` → Transactions
- `/transit-simulator` → Transit Simulator
- `/top-up-expiry` → Top-Up & Expiry
- `/settings` → Settings

All pages use one shared authenticated dashboard shell with:

- Persistent sidebar on desktop
- Horizontal quick-nav bar on mobile
- Active page highlighting
- Header breadcrumb style context: `TapTapToGo / {Current Page}`

## Page Wireframe / Component Breakdown

### 1) Dashboard

- `PageShell` (title, description, quick action)
- Metric row (`MetricCard` x4): Registered Cards, Active Trips, Expired Cards, Total Income
- Status panel (`Card`): Card Registry, Fare Engine, Route Load
- Quick Actions panel (`Card` + button links)
- Recent Transactions table (`Card` + responsive table)

### 2) Card Management

- `PageShell`
- Register Card form (`Card`, `Input`, `Button`)
- Registered Cards table (`Card` + responsive table)
  - UID
  - Balance
  - Expiry
  - Status
  - Tap Session state

### 3) Ticket Shop

- `PageShell`
- Single sale module (`Card` + UID input + action button)
- Bulk sale module (`Card` + quantity input + action button)
- Pricing matrix (`Card` + table)
- Latest sale summary (`Card`)

### 4) Transactions

- `PageShell` with transaction type filter action (`Select`)
- Totals row (`MetricCard` x3): Total Paid, Total Income, Total Quantity
- Transaction logs (`Card` + responsive table)
  - Date
  - Type
  - UID
  - Paid
  - Income

### 5) Transit Simulator

- `PageShell`
- Existing simulator module (`TransitSimulator`) embedded as dedicated page content
- Full tap-in/tap-out lifecycle, station fare matrix checks, and card event handling remain intact

### 6) Top-Up & Expiry

- `PageShell`
- Card selector module (`Card` + `Select`)
- Top-up module (`Card` + amount input + action button)
- Expiry extension module (`Card` + days input + action button)
- Selected card snapshot (`Card`): balance, expiry, event count

### 7) Settings

- `PageShell`
- Theme module (`Card` + `ThemeToggle`)
- System configuration module (`Card` + config inputs + save action)

## Suggested Reusable UI Components

These are the shared building blocks used and recommended for future pages:

- `AppShell` (global layout, nav, breadcrumb header, sign out)
- `PageShell` (consistent page title/description/actions)
- `MetricCard` (dashboard and totals KPIs)
- `ThemeToggle` (dark/light mode control)
- Shared UI primitives from `components/ui`:
  - `Card`
  - `Button`
  - `Input`
  - `Select`
- Standard responsive table pattern (`overflow-x-auto` + semantic table)

## Scalability Notes

- New modules can be added by creating a new route under `app/(dashboard)/.../page.tsx`.
- Sidebar/top-nav auto-scales by adding a single nav item in `lib/dashboard-nav.ts`.
- Auth and shell behavior remain centralized in:
  - `components/auth-gate.tsx`
  - `components/dashboard/app-shell.tsx`
