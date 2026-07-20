# OdontoAI

CRM for dental clinics in Brazil. A WhatsApp AI agent handles patient-facing
interactions (scheduling, basic recommendations, forwarding dentist-issued
prescriptions, payment collection), and a web dashboard lets dentists and
staff manage the calendar, patient records, and payments.

## Stack

- Next.js (App Router, TypeScript, Tailwind)
- Neon (Postgres) + Drizzle ORM, using the `neon-serverless` (WebSocket)
  driver — needed because `neon-http` doesn't support `db.transaction()`
- Auth.js v5 (NextAuth), Credentials provider (email + password), JWT
  sessions
- WhatsApp Business Platform (Meta Cloud API) — planned, not yet built

## Getting started

1. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` (Neon) and
   `AUTH_SECRET` (any random 32+ byte value, e.g. `openssl rand -base64 33`)
2. `npm install`
3. `npm run db:generate` then `npm run db:migrate` to create the schema
4. `npm run dev`

## Database scripts

- `db:generate` — generate a SQL migration from `src/db/schema`
- `db:migrate` — apply pending migrations to `DATABASE_URL`
- `db:push` — sync schema directly without a migration file (interactive;
  don't use in CI)
- `db:studio` — open Drizzle Studio

## Authentication

- Auth.js v5, JWT session strategy, Credentials provider (email + password,
  hashed with bcrypt)
- [src/auth.config.ts](src/auth.config.ts) — edge/proxy-safe config (no
  Credentials provider, so it never bundles db/bcrypt code)
- [src/auth.ts](src/auth.ts) — full config with the Credentials provider,
  used by Server Actions and the `/api/auth/*` route
- [src/proxy.ts](src/proxy.ts) — Next.js Proxy (formerly "Middleware"),
  gates every route under `/dashboard` and redirects unauthenticated users
  to `/sign-in`
- `/sign-up` creates a new clinic *and* its first user (`role: admin`) in
  one transaction. Inviting additional dentists/secretaries into an
  existing clinic isn't built yet.
- Roles: `admin`, `dentist`, `secretary`

## Data model (phase 1)

- `clinics` — a clinic (tenant)
- `dentists` — professional record, holds the CRO registration required to
  legally issue prescriptions
- `users` — login identity (email/password), belongs to a clinic, optionally
  linked to a `dentists` row
- `patients` — `phone` (E.164) is the key the WhatsApp AI agent will use to
  identify a patient
- `appointments` — status enum: scheduled/confirmed/completed/cancelled/no_show
- `payments` — Pix/boleto/card/cash, amounts stored in cents

## Roadmap

1. **Phase 1 (current)** — dentist dashboard: calendar, patients, manual
   payment tracking, authentication
2. **Phase 2** — WhatsApp AI scheduling agent (Meta Cloud API, tool-calling
   against the same appointments table)
3. **Phase 3** — prescriptions: AI drafts, dentist reviews and signs before
   it's sent to the patient (never AI-authored/autonomous)
4. **Phase 4** — invoicing/payment automation: NF-e/NFS-e via a provider
   (Focus NFe, eNotas) and Pix/boleto/card collection (Asaas, Pagar.me)

**Compliance:** patient health data is "dado sensível" under LGPD — explicit
consent, encryption at rest, and an access audit trail are required, not
optional.
