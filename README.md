# Fusion Space MVP

A Notion-style, white-theme, mobile-first collaboration hub with AI context parsing, auto task allocation, warning escalation, crisis reallocation, and contribution report.

## Stack

- Next.js 15 + TypeScript + Tailwind CSS
- Prisma ORM + **SQLite**（本地默认，零配置）/ 可选 **PostgreSQL**（Docker 或托管库）
- OpenAI-compatible **Chat Completions** API

## 本地开发（推荐）

1. Node.js **20+**
2. `cp .env.example .env`（Windows 可手动复制），填写 `OPENAI_API_KEY`（使用 AI 时）
3. 执行：

```bash
npm install
npx prisma migrate deploy
npm run dev
```

浏览器打开终端里提示的地址（注意端口，如 `http://localhost:3000`）。

### 常见问题

- **报错 `The column ... progressDigest does not exist` 或 Task 新字段不存在**：本地库落后于 `schema.prisma`。请先**停止** `npm run dev`，再执行 `npx prisma migrate deploy`（或开发时用 `npx prisma db push`），然后 `npx prisma generate`，再启动 dev。
- **接口报错 / 页面空白 / Prisma P1001**：`.env` 里若写了 `postgresql://...` 但本机没有跑 Postgres，会连不上库。请改回 `DATABASE_URL="file:./dev.db"` 或先启动数据库。
- **迁移失败 P3018 / 表已存在**：本地 SQLite 状态异常时执行（**会清空本地数据**）：

```bash
npm run db:reset
```

然后再次 `npx prisma migrate deploy`。

## 公网部署

- **SQLite 单容器（简单）**：构建本仓库 `Dockerfile`，挂载卷持久化 `/app/data`，入口脚本会执行 `prisma migrate deploy` 后 `next start`。
- **PostgreSQL（推荐正式环境）**：使用 Neon / Supabase / RDS 等，在部署平台配置 `DATABASE_URL`；需将 `schema.prisma` 的 `provider` 改为 `postgresql` 并用 `prisma migrate diff` 生成对应迁移（勿与 SQLite 迁移混用同一 history）。`docker-compose.yml` 中的 `db` 服务仅作可选本地 Postgres。

## Key API Routes

- `POST /api/projects` · `POST /api/projects/join` · `POST /api/auth/register` · `POST /api/auth/login` · `PATCH /api/auth/me` · `GET /api/me/overview`
- `POST /api/projects/:id/ai-parse` · `PATCH /api/tasks/:id/status` · `POST /api/tasks/:id/reallocate`
- `GET /api/projects/:id/dashboard` · `GET /api/projects/:id/report`

## Notes

- 任务终态 `DONE`、`REALLOCATED` 不可再流转。
- 再分配会按工作量扣减原负责人信用分（有上下限）。
- 勿将 `.env` 提交到 Git。

## Cursor：UI 风格

仓库内 `.cursor/rules/preserve-ui-style.mdc` 与根目录 `DESIGN.md` 约定 UI 定稿；**修改功能时不得擅自换风格**，除非在对话中明确要求改版。
