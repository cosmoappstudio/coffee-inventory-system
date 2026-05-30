# Immersion Coffee — Inventory System

Multi-location stock management for Immersion Coffee (San Diego). React + Vite + Supabase.

## Stack

- React 19, Vite 6, TypeScript, Tailwind v4
- Supabase (Auth, PostgreSQL, Realtime)
- Express API for Owner-only employee creation (service role)

## Local development

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run migrations in order:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_rls.sql`
3. In **Database → Replication**, enable Realtime for the `inventory` table (if not already added by migration).

### 2. Environment

Copy `.env.example` to `.env.local` and fill in:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SEED_DEFAULT_PASSWORD=80125
```

### 3. Seed data + auth users

```bash
npm install
npm run seed
```

This loads locations, items, inventory, transfers, usage logs, and creates auth users:

- Email: `imm-8012@immersion.internal` (per employee ID)
- Password: value of `SEED_DEFAULT_PASSWORD` (default `80125`)

### 4. Run app

```bash
npm run dev
```

Opens Vite on port 3000 and API on port 3001 (proxy `/api` → API).

## Login

| Field | Example |
|-------|---------|
| Employee ID | `IMM-8012` |
| Password | `80125` (after seed) |

Redirects by role:

- **Owner** → `/admin/dashboard`
- **Location Manager** → `/admin/transfers`
- **Barista** → `/shift`

## Deploy (Vercel + Supabase)

### Frontend (Vercel)

1. Import repo, framework **Vite**.
2. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Build: `npm run build`, output `dist`.
4. Add `vercel.json` SPA rewrite (included).

### Employee API (production)

The Owner “create employee” flow needs `SUPABASE_SERVICE_ROLE_KEY` on a server. Options:

- Deploy `server/index.ts` to Railway/Render/Fly with env vars.
- Set Vercel rewrites to that API URL, or use a Supabase Edge Function with the same logic.

For a quick demo, run API locally and use tunneling, or create users only via `npm run seed` and Supabase Dashboard.

## Project structure

```
src/
  context/     Auth, Inventory, Toast
  lib/         Supabase client, mappers, API helpers
  pages/       Login, admin/*, shift/*
  components/  Barista, transfers, dashboard, users
supabase/migrations/
scripts/seed.ts
server/index.ts
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Web + API |
| `npm run dev:web` | Vite only |
| `npm run seed` | Reset + seed Supabase |
| `npm run build` | Production build |
| `npm run lint` | Typecheck |
