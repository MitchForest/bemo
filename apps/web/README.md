# @repo/web

Next.js 15 + React 19 frontend for the Bemo learning experience. The app renders the multi-persona dashboard demo and exercises the shared API client against the Bun/Hono backend.

## Getting started

```bash
bun install
bun run dev --filter @repo/web        # http://localhost:3000
bun run build --filter @repo/web
bun run typecheck --filter @repo/web
```

The repo-wide `bun run dev` also works and will start every workspace in parallel.

### Environment

Create `apps/web/.env.local` if you want to point at a remote API:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

When omitted the app relies on the relative `/api` routes provided by the co-located API app during local development.

## Architecture tour

```
src/
├── app/                  # Next.js App Router entry points
│   ├── layout.tsx        # Root layout & font wiring
│   ├── page.tsx          # Persona switcher and dashboards
│   └── providers.tsx     # React Query provider
├── components/
│   ├── dashboard/        # Persona dashboards (student, teacher, parent, admin)
│   ├── patterns/         # Higher-level UI primitives (journey sections, joy breaks…)
│   ├── ui/               # Tailwind/Shadcn-flavoured elements (button, chip, dialog, card)
│   └── graphs/           # Lazy-loaded React Flow visualisations
├── hooks/                # React Query hooks for plan/profile/teacher roster data
├── lib/
│   ├── api/dashboard.ts  # Thin wrappers around `@repo/api-client`
│   └── utils.ts          # `cn` helper (Tailwind 4 merge)
└── config/demo-students.ts # Demo student IDs used across the UI
```

Key conventions:

- Server Components by default; we opt into Client Components where interactivity requires it (`"use client";`).
- Data fetching flows through `@repo/api-client` so every response is schema-validated before React Query caches it.
- Shared IDs (`DEFAULT_STUDENT_ID`, etc.) live in `config/` so hooks/components stay in sync.
- Tailwind CSS v4 powers styling; tokens are declared in `src/app/globals.css`.

## Data flow

1. `lib/api/dashboard.ts` composes the `@repo/api-client` helpers for plan, profile, and weekly reports.
2. Hooks in `src/hooks` orchestrate those calls via React Query (e.g. `useStudentDashboardData`).
3. Dashboards consume the hook results to render the UI states (loading, error, hydrated data) while staying fully typed through `@repo/schemas`.

## Testing & checks

No dedicated web tests ship yet. Run the shared repo checks instead:

```bash
bun run typecheck --filter @repo/web
bun run lint
```

Add Playwright/Cypress coverage when we introduce user flows that need regression protection.

## Contributing guidelines

- Extend schemas in `@repo/schemas` first so the API and client stay in lockstep.
- Prefer `@repo/api-client` over ad-hoc `fetch` calls; if a helper is missing, add it to the package before using it.
- Keep the `components/ui` surface minimal—delete unused primitives rather than letting them drift.
- Update this README whenever you introduce a new top-level feature or directory.
