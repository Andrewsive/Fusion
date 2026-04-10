# Fusion Space MVP

A Notion-style, white-theme, mobile-first collaboration hub with AI context parsing, auto task allocation, warning escalation, crisis reallocation, and contribution report.

## Stack
- Next.js 15 + TypeScript + Tailwind CSS
- Prisma + SQLite (local MVP)
- OpenAI Responses API

## Setup
1. Install Node.js 20+.
2. Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.
3. Run:
   - `npm install`
   - `npx prisma migrate dev --name init`
   - `npm run dev`

## Key Routes
- `POST /api/projects`
- `POST /api/projects/:id/join`
- `POST /api/projects/:id/ai-parse`
- `POST /api/projects/:id/tasks/ai-generate`
- `PATCH /api/tasks/:id/status`
- `POST /api/tasks/:id/reallocate`
- `GET /api/projects/:id/dashboard`
- `GET /api/projects/:id/report`

## Notes
- Terminal task states (`DONE`, `REALLOCATED`) are locked.
- `DONE` and `REALLOCATE` operations are transaction-safe.
- Reallocation applies credit penalty proportional to workload points.
