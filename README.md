# Lead Qualifier

Turns inbound leads into qualified, scored records automatically. Every lead is durably captured before anything else runs, so nothing gets lost, and sales only sees the ones worth calling.

**Live:** https://lead-qualifier-sepia.vercel.app

## The problem

A business puts a contact form on their site and the messages pile up in an inbox. Somebody has to read each one, work out whether it's a real prospect or spam, judge whether it's worth a callback, and log it somewhere. Most are junk, and the good ones get buried.

## What it does

A lead arrives as a messy, unstructured message. The pipeline:

1. **Receives** it at a webhook endpoint, the kind any contact form or CRM can post to
2. **Extracts** structured fields from the raw text using an LLM: name, company, budget, timeline, intent
3. **Scores** it 1 to 10 and writes a one-line summary
4. **Persists** everything to Postgres
5. **Notifies** Slack when a lead scores high enough to be worth calling

Everything lands in a dashboard sorted by score, with status colour-coded so anything needing attention is visible at a glance.

## Reliability

Most of the engineering here is in the failure paths, because a dropped lead is a lost customer and dropped leads rarely produce an error anyone sees.

- **The raw message is saved before extraction runs.** If extraction fails, the lead still exists and can be reprocessed. Raw first, enrich after.
- **Extraction is awaited before responding**, not deferred to background work. It is core business logic, not a side effect, so it does not belong in a best-effort path that can be cancelled when the serverless instance is reclaimed.
- **Persistence happens before notification.** If Slack is down you can retry from the stored row. The reverse would announce a lead that exists nowhere.
- **Each leg is isolated.** The database write and the Slack call fail independently, so one outage cannot skip the other.
- **Failures are recorded on the row** with an error message and a `failed` status, rather than disappearing into logs nobody reads.
- **The Slack call retries with backoff**, since most third-party failures are transient.
- **Duplicate deliveries are handled.** Webhook senders retry when they don't get a fast 200, so a unique dedupe key means the same lead arriving twice produces one row and one notification.
- **The LLM call has a timeout**, so a hung request cannot take the whole invocation down with the lead inside it.

Verified by deliberately breaking the Slack connection and confirming the lead still saves, the failure is recorded, and the endpoint still returns 200.

## Stack

Next.js (App Router, TypeScript), Vercel AI SDK with `generateObject` and Zod for schema-constrained extraction, Postgres via Supabase, Slack incoming webhooks, deployed on Vercel.

## Running locally

```bash
npm install
cp .env.example .env.local   # add your keys
npm run dev
```

Environment variables needed: `OPENAI_API_KEY`, your Supabase connection details, and `SLACK_WEBHOOK_URL`.

Post a test lead:

```bash
curl -X POST http://localhost:3000/api/leads/intake \
  -H "Content-Type: application/json" \
  -d '{"email":"jo@acme.com","message":"hey we need a chatbot asap, budget around 5k"}'
```
