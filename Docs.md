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
- FullCalendar (`@fullcalendar/react` + `daygrid`/`timegrid`/`interaction`,
  all pinned to `6.1.21`) for the Agenda page's calendar grid

The app is light-theme only — no `dark:` Tailwind variants, no
`prefers-color-scheme` handling. If dark mode comes back later, it needs to
be reintroduced deliberately rather than by adding `dark:` classes ad hoc.

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
- [src/db/schema/relations.ts](src/db/schema/relations.ts) — Drizzle
  `relations()` definitions (clinic ↔ dentists/patients/appointments/payments,
  appointment ↔ patient/dentist, payment ↔ patient) so dashboard queries can
  use `db.query.x.findMany({ with: {...} })` instead of manual joins. No
  migration needed — this is TS-only, doesn't touch the DB schema.

## Dashboard

All four dashboard sections are wired to real data (no more placeholders):

- [src/app/dashboard/dentists/](src/app/dashboard/dentists/) — list + add
  form. Required before appointments can be booked, since
  `appointments.dentistId` is `NOT NULL`; sign-up doesn't create one
  automatically. `[id]/page.tsx` is an edit page (name/email/CRO).
- [src/app/dashboard/patients/](src/app/dashboard/patients/) — list + add
  form; `[id]/page.tsx` is both the edit form (name/phone/CPF/birth
  date/email/notes) and shows the patient's appointment and payment history
  (via the relations above).
- [src/app/dashboard/calendar/](src/app/dashboard/calendar/) — a
  [FullCalendar](src/app/dashboard/calendar/full-calendar-view.tsx) week/
  month/day grid (client component, `timeZone: "America/Sao_Paulo"`,
  color-coded by appointment status, click an event to jump to that
  patient's page), a create form with the same dentist-double-booking
  conflict check used by the WhatsApp agent's `book_appointment` tool, and a
  plain table below the calendar for changing an appointment's status (the
  calendar itself is read/navigate-only for now).
  - **FullCalendar version pin**: `@fullcalendar/react` is on a newer major
    (7.x) than the plugin packages (`daygrid`/`timegrid`/`interaction`,
    still 6.1.21 stable — 7.x for those is RC-only). Installing without
    exact versions pulls two different `@fullcalendar/core` instances into
    the tree and breaks at runtime ("invalid plugin"). All five packages
    are pinned to `6.1.21` in `package.json` — don't `npm update` this
    group without re-checking that the plugin packages have a matching
    stable major.
  - **Timezone note**: `datetime-local` inputs carry no timezone, and the
    server action runs server-side (often UTC in production), not in the
    browser's zone. [actions.ts](src/app/dashboard/calendar/actions.ts) pins
    the input to `-03:00` (Brazil has used one offset nationwide since
    abolishing DST in 2019) rather than trust ambiguous local parsing. This
    would need revisiting for clinics outside that offset (e.g. Acre).
- [src/app/dashboard/payments/](src/app/dashboard/payments/) — list + add
  form (amount entered in reais, stored as `amountCents`) + a "mark as paid"
  action. No real Pix/boleto/NF-e generation yet — that's Phase 4.
- Every query and mutation is scoped by `session.user.clinicId` from
  Auth.js, both on reads (`where eq(x.clinicId, clinicId)`) and on writes
  (looked up server-side, never trusted from form input) — this is the
  multi-tenancy boundary, so don't bypass it when adding new pages.

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
- **Reply to `contacts[].wa_id`, not `messages[].from`.** For Brazilian
  numbers these can differ (the historical extra mobile "9" digit); sending
  to `from` is silently accepted by the Graph API (200 OK) but never
  delivered. [whatsapp.ts](src/lib/whatsapp.ts)'s parser extracts both, and
  the webhook always sends to `waId`.
- **The webhook config screen alone isn't enough for messages to arrive.**
  Verifying the callback URL and toggling the `messages` field in the
  simplified onboarding UI doesn't actually route events until you also
  subscribe the app to that WhatsApp Business Account:
  `POST https://graph.facebook.com/v21.0/{waba-id}/subscribed_apps` with a
  bearer token that has the `whatsapp_business_management` scope. The
  dashboard's own "Test" button bypasses this (so it can look like
  everything works when real messages still don't arrive) — the classic
  per-field webhook tester at `developers.facebook.com/apps/<id>/webhooks/`
  (product: **Whatsapp Business Account**) is the more reliable place to
  confirm subscription state and fire test payloads.
- **Unverified apps are geo-restricted from messaging some countries,
  including Brazil**, until **Business Verification** is completed (Meta
  Dashboard → your app → Publish → submit CNPJ/business docs). Symptom: the
  send call succeeds against your own server logic but the webhook response
  body contains `"Business account is restricted from messaging users in
  this country."` This is required before real launch anyway, so it isn't
  wasted setup time.
- Publishing the app also requires a **Privacy Policy URL** in Basic
  Settings — needs a real, LGPD-compliant policy before production, not
  just a placeholder.

## Roadmap

1. **Phase 1 (done)** — dentist dashboard: calendar, patients, payments,
   team (dentists), authentication — all wired to real data
2. **Phase 2 (done, pending Anthropic credits)** — WhatsApp AI scheduling
   agent. Verified end-to-end with a real WhatsApp number and real
   messages; the only remaining gap is that live AI replies need Anthropic
   API credits (`AI_MOCK_MODE` stands in until then)
3. **Phase 3** — prescriptions: AI drafts, dentist reviews and signs before
   it's sent to the patient (never AI-authored/autonomous)
4. **Phase 4** — invoicing/payment automation: NF-e/NFS-e via a provider
   (Focus NFe, eNotas) and Pix/boleto/card collection (Asaas, Pagar.me)

**Compliance:** patient health data is "dado sensível" under LGPD — explicit
consent, encryption at rest, and an access audit trail are required, not
optional.
