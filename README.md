# Enterprise Intelligence Layer MVP

A Vercel-ready interactive MVP for a governed enterprise AI orchestration layer. The demo shows a fictional HR Policy Assistant for Northstar Health Systems and compares a generic AI answer with a governed, role-aware, policy-backed answer.

For a polished product write-up, see [Overview of MVP for Intelligence Layer Platform](docs/intelligence-layer-mvp-overview.md).

## What It Demonstrates

- Tenant rulebook injection
- Role-aware response behavior
- Approved policy context retrieval
- OpenAI Responses API calls with Structured Outputs
- Admin-editable rule, role, policy, and agent settings
- Auditable interaction history
- Hybrid execution: deterministic demo mode, live OpenAI mode, or automatic fallback

## Environment

Create `.env.local` for local development or set these in Vercel:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
DATABASE_URL=
```

`DATABASE_URL` should point to a Postgres database such as Vercel Postgres, Neon, or Supabase. If `DATABASE_URL` is omitted, the app uses in-memory demo storage for local UI review only.

The app defaults to Demo mode in the UI so stakeholder walkthroughs remain reliable without API credits. Live AI calls OpenAI when API access and billing are configured. In production, Admin, Audit, and model execution would be protected by enterprise SSO and role-based access control; this MVP keeps access open to reduce reviewer friction.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and run the default remote-work query in Demo mode.

## Deploy To Vercel

1. Push this project to a Git repository.
2. Import it into Vercel.
3. Optionally add `OPENAI_API_KEY`, `OPENAI_MODEL`, and `DATABASE_URL`.
4. Deploy.

The app creates its Postgres tables automatically on first read/write:

- `app_config`
- `audit_events`

## Demo Flow

1. Start on the Demo tab.
2. Select a role: Employee, Manager, HR Admin, or Compliance.
3. Run “Can I work remotely from another state for 3 months?”
4. Compare Generic AI vs Governed AI.
5. Review the Intelligence Layer Trace.
6. Edit tenant rules or policy snippets on the Admin tab.
7. Rerun the question and inspect the Audit tab.
