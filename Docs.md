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
  Meta payload shape, and `sendWhatsAppReply()` (splits a multi-paragraph
  reply into separate WhatsApp messages — see Humanization below)
- [src/lib/ai/tools.ts](src/lib/ai/tools.ts) — the agent's tool set
  (`list_dentists`, `check_availability`, `book_appointment`,
  `list_my_appointments`, `cancel_appointment`, `escalate_to_human`), each
  closed over `clinicId`/`patientId`/`conversationId` and backed by the same
  Drizzle tables the dashboard uses
- [src/lib/ai/agent.ts](src/lib/ai/agent.ts) — the system prompt (persona,
  hard scope rules, escalation triggers, WhatsApp-native tone, few-shot
  examples) and `respondToPatientMessage()`, which loads history, runs the
  Beta Tool Runner, and persists the reply. Returns `string | null` — `null`
  means the inbound message was a duplicate delivery and nothing should be
  sent (see below).
- **Persist the Tool Runner's full turn sequence, not just the final
  message.** `client.beta.messages.toolRunner()` can loop through several
  internal tool_use → tool_result round trips before producing the final
  text reply; awaiting it only gives you that last message; the intermediate
  turns are otherwise silently discarded — not persisted, and (worse) not
  replayed into the next turn's history, so the model can lose track of
  what it already checked or booked and start hallucinating confirmations.
  The fix: keep the `runner` object (`const runner = client.beta.messages.toolRunner(...)`),
  and after `await runner` resolves, read `runner.params.messages` — a
  public getter (verified directly against
  `node_modules/@anthropic-ai/sdk/src/lib/tools/BetaToolRunner.ts`, not
  guessed) exposing the array the runner itself appends to on every
  iteration, i.e. the *complete* sequence: `[...inputMessages, assistantTurn1
  (tool_use), toolResultTurn1, assistantTurn2, ..., finalAssistantTurn]`.
  Slice off the input length and persist each remaining turn as its own row.
- **Ground the model with today's actual date.** Without it, the model has
  no way to resolve a date given without a year (e.g. a patient writing
  "28/07") and silently guesses — in testing it defaulted to the wrong year
  entirely, producing a real appointment booked a year off. Fixed by
  computing today's date (`America/Sao_Paulo`) at request time and passing
  it into `buildSystemPrompt()`. This does mean the system prompt's cached
  prefix (`cache_control: ephemeral`) invalidates once per day instead of
  never — an acceptable tradeoff for not double-booking a year wrong.
- [src/app/api/whatsapp/webhook/route.ts](src/app/api/whatsapp/webhook/route.ts)
  — `GET` handles Meta's verification challenge; `POST` verifies the
  signature, resolves the clinic from `clinics.whatsappPhoneNumberId`,
  finds-or-creates the patient/conversation, calls the agent, sends the
  reply
- **Known simplification**: the webhook currently runs the LLM turn inline
  (no queue) — fine at low volume, but before real traffic this should move
  to a queue (Inngest/QStash) so the webhook acks in milliseconds instead of
  holding the connection open for the LLM round trip. This is also *why* the
  duplicate-delivery issue below happens in the first place — a queue would
  ack Meta immediately and remove the retry trigger, not just handle it.
- **Meta redelivers a webhook it thinks timed out — dedupe on `waMessageId`.**
  Once real (non-mocked) LLM calls got slow enough to approach Meta's
  delivery timeout, a single patient message started producing two
  *independent* AI replies (same intent, differently worded — not literally
  duplicated text, since each redelivery is its own LLM completion). Fixed
  by adding a unique `messages.waMessageId` column
  ([relations/schema](src/db/schema/conversations.ts)) and making the
  insert itself the dedup point: `respondToPatientMessage()` tries to insert
  the inbound message with its `waMessageId`, and if that hits the unique
  constraint (checked via `error.cause.code === "23505"`, since Drizzle
  wraps the underlying pg error), it returns `null` instead of calling the
  LLM again. This is deliberately insert-time (atomic), not a
  check-then-insert — a plain `SELECT` first would still race if a retry
  arrives while the first delivery is mid-flight. The webhook route also
  does a cheap pre-check `SELECT` before doing any patient/conversation
  work, purely as a fast path for the common case — wrapped in try/catch to
  fail open (proceed rather than 500) if it errors, since the atomic insert
  is the actual guarantee, not this pre-check.
- **[src/db/index.ts](src/db/index.ts) needs a `pool.on("error", ...)`
  handler.** Neon's pooled WebSocket connections can go stale (idled out
  after inactivity) and node-postgres's `Pool` emits an `"error"` event when
  it discovers a dead pooled client — without a listener, Node treats that
  as an uncaught exception on an otherwise-unrelated request, not just a
  failed query. Surfaced as `ETIMEDOUT` / a `CLOSED`-state `WebSocket` in the
  dedup pre-check after a long-idle dev session. The listener just logs; the
  pool still needs the event handled at all to correctly evict and recreate
  the broken client on the next checkout.
- **`AI_MOCK_MODE=true`** (dev only) — `respondToPatientMessage()` skips the
  real Anthropic call and returns a canned reply, so the webhook → DB →
  WhatsApp-send pipeline can be exercised end-to-end without spending API
  credits. It still writes real `messages`/`conversations` rows. Never set
  this in production.
- **`WHATSAPP_ACCESS_TOKEN` keeps expiring** if you're using the temporary
  token from the API Setup screen (24h, and regenerating invalidates the
  old one immediately). For a token that doesn't need manual regeneration:
  Meta Business Settings → **Users → System Users** → create one → assign
  it access to the app/WhatsApp Business Account with
  `whatsapp_business_messaging` (+ `whatsapp_business_management` for the
  `subscribed_apps` call above) → generate its token with **no expiration**
  (System User tokens support this; personal user tokens cap at 60 days).
  Use that as `WHATSAPP_ACCESS_TOKEN` instead.
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

### Humanization

Techniques used to make "Bia" read like a person texting, not a bot,
implemented across [agent.ts](src/lib/ai/agent.ts) (prompt) and
[whatsapp.ts](src/lib/whatsapp.ts) (delivery):

- **Multi-bubble replies.** The prompt instructs the model to split a
  reply with more than one idea into 2-3 short chunks separated by a blank
  line. `sendWhatsAppReply()` splits on that and sends each chunk as its
  own WhatsApp message — real people send several short texts in a row
  rather than one long paragraph.
- **Typing-delay simulation.** Between chunks (not before the first),
  there's a short delay roughly proportional to chunk length
  (`400 + length * 30ms`, clamped to 600-2500ms) so replies don't all land
  in the same instant.
- **Tone mirroring.** The prompt explicitly says to match the patient's
  register — casual/no punctuation gets a casual reply, formal gets a
  formal one — rather than always defaulting to one voice.
- **Varied openers.** The model is told not to repeat the same opening
  phrase (e.g. "Prontinho!", "Boa notícia!") across a conversation, since
  reusing whatever worked well in-context is a common way LLM replies read
  as repetitive/robotic over a longer chat.
- **Few-shot examples cover a range of registers**, not just the happy
  path: a formal greeting, an irritated/repeat-complaint patient (still
  routes to `escalate_to_human`, but acknowledges the frustration instead
  of a flat corporate response), and a scheduling conflict (never invents
  an alternative time — always checks real availability first).
- Still open, not yet implemented: no persisted memory of a patient's
  preferred tone across separate conversations (each conversation starts
  fresh); no sentiment-based escalation heuristics beyond the explicit
  keyword-driven rules already in the "nunca faz" section.

## Phase 3 — Prescriptions

Prescriptions are authored and signed entirely by the dentist in the
dashboard — **the AI never drafts, writes, or alters medication content**.
The WhatsApp agent's only role is to forward an already-signed document to
the patient on request, verbatim.

- **Schema** ([prescriptions.ts](src/db/schema/prescriptions.ts)): a
  `prescriptions` table with a `draft`/`signed` status. `draft` rows are
  invisible to the WhatsApp agent entirely; signing
  (`signPrescriptionAction` in
  [dashboard/prescriptions/actions.ts](src/app/dashboard/prescriptions/actions.ts))
  sets `signedAt` and is treated as final — there's no unsign/edit action,
  matching how a real signed prescription can't be quietly edited after
  the fact.
- **Dashboard** ([dashboard/prescriptions/](src/app/dashboard/prescriptions/)):
  a dentist creates a prescription (patient, dentist, free-text content)
  as a draft, then signs it once it's final. Also surfaced on each
  patient's detail page alongside their appointments/payments.
- **WhatsApp tools** ([lib/ai/tools.ts](src/lib/ai/tools.ts)):
  - `list_prescriptions` returns only `id`/`signedAt`/dentist name for the
    patient's **signed** prescriptions — the medication content is
    deliberately never included in what the model sees, so there's nothing
    for it to read, remember, or repeat even by accident.
  - `send_prescription` takes a `prescriptionId`, re-verifies clinic/
    patient/`status="signed"` scoping server-side (never trusts anything
    the model inferred), and sends the stored `content` directly via
    `sendWhatsAppReply` — **the model's own reply text is never the
    vehicle for the prescription content**. This means the AI can't
    paraphrase, summarize, or subtly alter a legal medical document; the
    tool either forwards the exact signed text or reports failure.
  - Unlike every other tool in this file, `send_prescription` makes an
    external HTTP call (the WhatsApp send) rather than just touching the
    DB, so its `run()` wraps that call in try/catch and returns
    `{ok: false, ...}` on failure instead of throwing — a thrown error
    here would otherwise crash the whole tool-runner turn the same way
    the unguarded Neon pool error used to crash the webhook (see Phase 2
    fixes above).
- **Known limitation:** signing here is an in-app attestation (dentist
  clicks "Assinar" while logged in), not an ICP-Brasil digital signature.
  It's an audit-trail record (`dentistId` + `signedAt`), not yet a
  legally-dispensable e-prescription on its own — real dispensing still
  relies on whatever physical/certified document the clinic issues
  outside this flow. Also, proactive dashboard-triggered sends aren't
  implemented: WhatsApp's 24-hour session-message policy means free-form
  text (like a prescription) can only be sent in response to the patient
  messaging first, which is exactly the `send_prescription` flow above.

## Phase 4 — Pix payments (MVP)

Scoped down from full invoicing to just Pix, following the same
"AI-forwards-a-value-it-never-generates" pattern used for prescriptions:
the WhatsApp agent shares the clinic's Pix key on request and stores
whatever receipt the patient sends back — it never marks a payment as paid
by itself.

- **Schema:**
  - `clinics.pixKey` ([clinics.ts](src/db/schema/clinics.ts)) — set by staff
    in the new [`/dashboard/settings`](src/app/dashboard/settings/) page.
  - `payment_receipts` ([payment-receipts.ts](src/db/schema/payment-receipts.ts))
    — stores the receipt image/PDF as `bytea` directly in Postgres (no
    object storage configured in this project, so this was the zero-new-
    infra option). References both `appointmentId` and `paymentId`
    (both nullable) because a patient can have several appointments each
    with their own payment(s), so a bare incoming photo can't always be
    pinned to one payment automatically.
- **`share_pix_key` tool** ([lib/ai/tools.ts](src/lib/ai/tools.ts)): same
  verbatim-dispatch pattern as `send_prescription` — the model never types
  the Pix key itself, since a single hallucinated or transposed character
  in a financial routing value would misdirect a real payment. It only
  learns whether the send succeeded.
- **Receiving the receipt** ([lib/whatsapp.ts](src/lib/whatsapp.ts),
  [lib/receipts.ts](src/lib/receipts.ts)): this is the first inbound
  non-text message type the webhook handles.
  - `parseInboundWhatsAppMessage` now returns a discriminated union
    (`type: "text" | "image" | "document"`) instead of always assuming
    text. **TS narrowing gotcha hit here:** `if (inbound.type === "image" ||
    inbound.type === "document")` did NOT narrow the `else` branch back to
    `InboundTextMessage` (TS kept complaining `.text` didn't exist on the
    union afterwards) — checking the single-literal branch instead,
    `if (inbound.type !== "text")`, narrowed correctly. Root cause is that
    one variant's discriminant is itself a 2-literal union (`"image" |
    "document"`), which behaves differently from the textbook one-literal-
    per-variant discriminated union.
  - `downloadWhatsAppMedia()` does the documented two-step Graph API
    exchange (resolve media id → short-lived URL, then fetch that URL,
    both calls bearer-authed) — Meta never inlines media bytes in the
    webhook payload itself.
  - `receivePaymentReceipt()` matches to a payment only when the patient
    has **exactly one** pending payment; otherwise the receipt is stored
    unmatched for staff to reconcile by hand on the
    [payments page](src/app/dashboard/payments/page.tsx) (thumbnail +
    dropdown of that patient's pending payments). Storage, the
    conversation log entries, and the conversation timestamp bump all
    happen inside one `db.transaction()`, gated by a unique `waMessageId`
    constraint — the same atomic-insert-as-dedup pattern used for text
    messages, extended to a real DB transaction here since a receipt
    write touches multiple tables at once.
  - `isUniqueViolation`/`hasPgCode` were pulled out of `agent.ts` into a
    shared [`lib/db-errors.ts`](src/lib/db-errors.ts) once a second module
    needed the same Drizzle-wraps-the-real-pg-error-in-`.cause` logic.
- **Verified against the real database:** the Pix key lookup, the
  single-vs-multiple-pending-payment matching logic, bytea round-tripping
  exact bytes, and that a simulated webhook redelivery (same
  `waMessageId` twice) is rejected by the unique constraint without
  creating a duplicate receipt row. The actual Meta media download and
  WhatsApp send calls weren't live-tested (same reasoning as Phase 3 — no
  real media id/test recipient to safely exercise against the live Graph
  API).
- **Known limitations:** no OCR/vision reading of the receipt to
  auto-verify the amount — staff visually confirm before marking a
  payment paid; matching beyond the "exactly one pending payment" case is
  entirely manual; NF-e/NFS-e invoice emission and boleto/card collection
  are still unscoped (see below).

## Roadmap

1. **Phase 1 (done)** — dentist dashboard: calendar, patients, payments,
   team (dentists), authentication — all wired to real data
2. **Phase 2 (done)** — WhatsApp AI scheduling agent. Verified end-to-end
   with a real WhatsApp number and a real (non-mocked) Anthropic call,
   including an actual `appointments` row created via the tool-calling
   loop. `AI_MOCK_MODE` remains available for dev/demo use without
   spending API credits.
3. **Phase 3 (MVP done)** — prescriptions: dentist authors and signs in the
   dashboard, WhatsApp agent forwards the signed document to the patient
   verbatim on request (never AI-authored). DB-layer scoping and state
   transitions verified against the real database; the actual WhatsApp
   dispatch call itself wasn't live-tested end-to-end to avoid hitting the
   real Graph API with test data. Still open: no e-signature (see
   limitation above), no notification to the dentist when a patient asks
   for a prescription that isn't signed yet.
4. **Phase 4 (Pix MVP done)** — Pix key sharing + receipt collection via
   WhatsApp, described above. NF-e/NFS-e emission (Focus NFe, eNotas) and
   boleto/card collection (Asaas, Pagar.me) remain unscoped follow-ups.

**Compliance:** patient health data is "dado sensível" under LGPD — explicit
consent, encryption at rest, and an access audit trail are required, not
optional.
