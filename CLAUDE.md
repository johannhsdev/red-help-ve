# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

This repo contains two separate projects:

- **Root** — a Vite + React 19 + TypeScript app (`src/`, `index.html`, `vite.config.ts`). Currently a starter template being developed into the main app.
- **`template-logic/`** — a Next.js 16 + Tailwind CSS 4 + shadcn/ui prototype that models the full domain logic, used as a reference implementation.

## Commands

### Root app (Vite)
```
npm run dev       # start dev server
npm run build     # tsc -b && vite build
npm run lint      # eslint
npm run preview   # preview production build
```

### template-logic (Next.js)
```
pnpm dev          # start dev server
pnpm build        # production build
pnpm lint         # eslint
```

## Domain model

The app is a missing-persons and supply-center registry for Venezuela ("red-help-ve"). Core types live in `template-logic/lib/types.ts`:

- `MissingPerson` — tracks a person with `status: "desaparecida" | "encontrada"` and optional `foundInfo` (found at family, a registered center, or an external center).
- `SupplyCenter` — a relief center with needs and schedule.
- `RegistryRecord = MissingPerson | SupplyCenter` — the union type used throughout.

## template-logic architecture

- `lib/use-registry.ts` — central state hook managing the in-memory registry of records.
- `lib/seed.ts` — seed data for local development.
- `app/api/upload/route.ts` — Vercel Blob upload endpoint for photos.
- `components/registry-view.tsx` — main list/search view.
- `components/register-dialog.tsx` — form to add new records (person or center).
- `components/found-dialog.tsx` — form to mark a person as found with `FoundInfo`.
- `components/record-card.tsx` — card rendering for both record types.
- UI primitives in `components/ui/` are shadcn/ui components (do not hand-edit them).
