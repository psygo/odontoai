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
- WhatsApp Business Platform (Meta Cloud API) for the patient-facing channel
- Anthropic SDK (`claude-opus-4-8`, tool-calling via the Beta Tool Runner)
  for the patient-facing AI agent

## Getting started

1. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` (Neon),
   `AUTH_SECRET` (any random 32+ byte value, e.g. `openssl rand -base64 33`),
   `ANTHROPIC_API_KEY`, and the `WHATSAPP_*` vars (see Phase 2 section below)
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
- `conversations` — one per patient/clinic WhatsApp thread; `status`
  (active/escalated/closed) is how the AI hands off to clinic staff
- `messages` — full Anthropic content-block history per conversation, so it
  can be replayed straight back into the Messages API

## Phase 2 — WhatsApp AI agent

- [src/lib/whatsapp.ts](src/lib/whatsapp.ts) — send a text message via the
  Graph API, verify the `X-Hub-Signature-256` webhook signature, parse the
  Meta payload shape
- [src/lib/ai/tools.ts](src/lib/ai/tools.ts) — the agent's tool set
  (`list_dentists`, `check_availability`, `book_appointment`,
  `list_my_appointments`, `cancel_appointment`, `escalate_to_human`), each
  closed over `clinicId`/`patientId`/`conversationId` and backed by the same
  Drizzle tables the dashboard uses
- [src/lib/ai/agent.ts](src/lib/ai/agent.ts) — the system prompt (persona,
  hard scope rules, escalation triggers, WhatsApp-native tone, few-shot
  examples) and `respondToPatientMessage()`, which loads history, runs the
  Beta Tool Runner, and persists the reply
- [src/app/api/whatsapp/webhook/route.ts](src/app/api/whatsapp/webhook/route.ts)
  — `GET` handles Meta's verification challenge; `POST` verifies the
  signature, resolves the clinic from `clinics.whatsappPhoneNumberId`,
  finds-or-creates the patient/conversation, calls the agent, sends the
  reply
- **Known simplification**: the webhook currently runs the LLM turn inline
  (no queue) — fine at low volume, but before real traffic this should move
  to a queue (Inngest/QStash) so the webhook acks in milliseconds instead of
  holding the connection open for the LLM round trip
- **`AI_MOCK_MODE=true`** (dev only) — `respondToPatientMessage()` skips the
  real Anthropic call and returns a canned reply, so the webhook → DB →
  WhatsApp-send pipeline can be exercised end-to-end without spending API
  credits. It still writes real `messages`/`conversations` rows. Never set
  this in production — added while the Anthropic account was blocked on a
  billing/payment issue.
- To connect a real WhatsApp number: Meta Business verification, a
  WhatsApp Business phone number, set `whatsappPhoneNumberId` on the
  clinic row, and fill in the `WHATSAPP_*` env vars

## Roadmap

1. **Phase 1 (done)** — dentist dashboard: calendar, patients, manual
   payment tracking, authentication
2. **Phase 2 (current)** — WhatsApp AI scheduling agent
3. **Phase 3** — prescriptions: AI drafts, dentist reviews and signs before
   it's sent to the patient (never AI-authored/autonomous)
4. **Phase 4** — invoicing/payment automation: NF-e/NFS-e via a provider
   (Focus NFe, eNotas) and Pix/boleto/card collection (Asaas, Pagar.me)

**Compliance:** patient health data is "dado sensível" under LGPD — explicit
consent, encryption at rest, and an access audit trail are required, not
optional.
