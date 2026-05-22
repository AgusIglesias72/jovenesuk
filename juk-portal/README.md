# JUK Portal de Gestión Interno

Back-office tool for **Jóvenes en UK** (JUK), an Argentine travel agency organizing English-language study trips to the UK.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack default)
- **Language:** TypeScript (strict)
- **Database:** PostgreSQL on Neon (region `sa-east-1`)
- **ORM:** Drizzle ORM
- **Auth:** Better-Auth (email + password, role-based)
- **Background jobs:** Trigger.dev v4
- **Email:** Resend + React Email
- **File storage:** Cloudflare R2
- **Hosting:** Vercel (region `gru1` — São Paulo)
- **Observability:** Sentry
- **UI:** React 19 + Tailwind CSS + JUK Design System

## Quickstart

```bash
# 1. Clone and install
git clone <repo>
cd juk-portal
nvm use         # uses .nvmrc — Node 22 LTS
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in: DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY,
#         R2 credentials, TRIGGER_API_KEY, SENTRY_DSN

# 3. Run database migrations
npm run db:push           # creates tables in Neon
npm run db:seed           # seeds test data

# 4. Start dev server
npm run dev               # localhost:3000
```

## Project structure

```
juk-portal/
├── src/
│   ├── app/                          ← Next.js 16 App Router
│   │   ├── (admin)/                  ← Internal portal (4 admins)
│   │   ├── (auth)/                   ← Login, password reset
│   │   ├── api/
│   │   │   ├── v1/                   ← Public API REST (versioned)
│   │   │   └── webhooks/             ← Google Form, Trigger callbacks
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── lib/
│   │   ├── db/                       ← Drizzle schemas + queries
│   │   │   ├── schema/               ← One file per entity
│   │   │   ├── queries/              ← Reusable typed queries
│   │   │   └── index.ts              ← DB client
│   │   ├── domain/                   ← Pure business logic (no Next deps)
│   │   │   ├── alumnos/
│   │   │   ├── viajes/
│   │   │   ├── pagos/
│   │   │   └── pasos/
│   │   ├── auth/                     ← Better-Auth config + helpers
│   │   ├── email/                    ← Resend client + templates
│   │   │   └── templates/            ← React Email components
│   │   ├── jobs/                     ← Trigger.dev task definitions
│   │   └── utils/
│   ├── components/
│   │   └── ui/                       ← JUK Design System components
│   ├── styles/
│   └── trigger/                      ← Trigger.dev v4 task files
├── drizzle/                          ← Generated migrations
├── docs/                             ← Architecture decision records
├── package.json
├── tsconfig.json
├── next.config.ts
├── drizzle.config.ts
├── tailwind.config.ts
├── trigger.config.ts
└── .env.example
```

## Architecture principles

1. **Business logic lives in `lib/domain/`**, free of Next.js/React imports. Both the web UI and the future REST API call into it. The day the mobile app arrives, it consumes `api/v1/` which is just a thin REST adapter over the same domain.

2. **Database access goes through `lib/db/queries/`**, not raw drizzle calls scattered across components. Queries are typed and reusable.

3. **Server components by default** for read paths; **Server Actions** for mutations triggered from the UI; **Route Handlers** under `api/v1/` for external consumers (future mobile app, integrations).

4. **One feature, one folder.** A feature owns its schema slice, its domain logic, its queries, its API routes, and its UI pages. We don't fan files of the same feature across the project.

## Roles

The system has 4 roles, modeled in the `user` table:

- `admin_juk` — internal team (María, Felix, Delfina, Tomas)
- `super_admin` — admin who can also manage users (subset of admin_juk)
- `representante` — external group leader (future portal)
- `familia` — student/parent read-only access (future portal)

This PRD v1.1 covers only the `admin_juk` portal. The other roles' UI is out of scope but their auth tables already exist.

## See also

- `docs/architecture.md` — full architectural decisions
- `docs/phases.md` — implementation plan
- `docs/data-model.md` — entity relationships
- [JUK Design System](https://github.com/...) — visual reference
