# Factory ERP — Web UI (MVP)

Front end for the factory-first cloud ERP described in `../test/FactoryERP_MVP_Architecture.md`. It covers every R1 (MVP) module with interactive mock data; there is no backend yet.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
```

Useful entry points:

| Route | What |
| --- | --- |
| `/dashboard` | Owner dashboard (FR-RP-01) |
| `/sales/orders/so1` | Reference form view (status bar, smart buttons, lines, GST totals, chatter) |
| `/shopfloor` | Operator terminal (offline-first, PIN login, Hindi/English) |
| `/design-system` | Living style guide for the "Forge" design system |

Keyboard: `⌘K` / `Ctrl+K` global search · `Alt+A` app launcher · `/` focuses the list search.

Use the user menu (top right) → **Demo: view as role** to switch between Owner, Production head, Store keeper, Accountant and Sales. Menus, actions and cost/rate/margin fields change with the role (architecture §5).

## Stack

- **Next.js 16 (App Router)** + React 19 + TypeScript. The architecture doc recommended a Vite SPA; this UI uses Next.js as requested. It runs as client components over mock zustand stores, so it can move to API data (TanStack Query or server components) module by module.
- **Tailwind CSS v4** with design tokens in `src/app/globals.css`.
- **Radix UI** primitives (dialog, dropdown, popover, tooltip, tabs), **cmdk** command palette, **sonner** toasts, **lucide** icons, **recharts** (dashboard only; not loaded on the shop-floor terminal).
- **zustand** stores per domain in `src/lib/store/*` hold the mock data and implement the workflow transitions.

## Structure

```
src/
  app/
    (erp)/            ERP shell routes (sidebar + header)
      dashboard/ sales/ purchase/ inventory/ manufacturing/ jobwork/
      finance/ reports/ approvals/ settings/ design-system/
    shopfloor/        Operator terminal, outside the ERP shell
  components/
    ui/               Primitives: Button, Badge/StatusBadge, Input/Select/Field, Dialog/Sheet/Menu/Popover/Tip
    erp/              ERP patterns: ControlPanel, DataTable, ListPage (list + kanban), FormPage, StatusBar,
                      SmartButtons, Sheet, Notebook, Totals, Chatter (audit trail), Card, Banner
    shell/            Sidebar, Header, AppLauncher, CommandPalette
    <domain>/         Domain-specific components
  lib/
    data/masters.ts   Company, parties, items, warehouses, work centres, operators, reason codes
    store/            app (role, language, notifications) + one store per domain
    nav.ts            Module and menu definition (sidebar, launcher, search)
    utils.ts          INR / Indian date / FY / amount-in-words helpers
```

## Design system ("Forge")

- **Colour:** a petrol-teal brand (`--primary-600 #0d7377`) on cool graphite neutrals, with a deep petrol sidebar (`--brand-900`). Saffron (`--accent-500`) is used only in the logo and for rare emphasis. Status colours (success, warning, danger, info, progress, neutral) are used only to carry meaning.
- **Type:** IBM Plex Sans with Plex Sans Devanagari for Hindi, and Plex Mono for codes and document numbers. Base size is 13 px for tables and forms, 14 px for body text. Numbers use tabular figures and Indian digit grouping.
- **Density:** controls are 32 px high (28 px small); tables have 40 px rows; shop-floor touch targets are at least 56 px.
- **Shape and elevation:** corners are 6 px on controls and 12 px on cards. Shadows are restrained (xs and sm on cards, pop on overlays).
- **Patterns:**
  - Odoo-style control panel (search with facet chips, Filters / Group by / Favourites, list ↔ kanban, pager).
  - Odoo-style form sheet (action bar, status bar, smart buttons, notebook tabs, chatter).
  - Zoho-style sidebar navigation, side-panel quick views and invoice document preview.
