# SVP Analytics — Backend API

REST API for the **SVP Partner Engagement Dashboard** — tracks partners, investees, groups, appointments, and partner-scoped dashboards for SVP chapters.

- **Runtime:** Node.js 18+ / Express
- **Database:** PostgreSQL 12+ (Prisma ORM with `pg` adapter)
- **Docs:** Swagger UI at `/api/docs`
- **Auth:** JWT (Bearer token)

---

## Swagger generation

The project ships a small generator that emits the Swagger specification used by the UI. Run this before starting the server if you change JSDoc comments or route metadata:

```bash
# generate swagger.json used by the UI
npm run swagger
```

The generated spec is served by the running server at `/api/docs` (Swagger UI).

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 (tested on 22) |
| PostgreSQL | ≥ 12 with `psql` CLI available |

### Setup (first time)

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client (required before starting the server)
npx prisma generate

# 3. Interactive wizard — creates DB user + database, applies schema, seeds data, writes .env
npm run setup

# 4. (Optional) regenerate Swagger spec if you edit route docs
npm run swagger

# 5. Start the development server
npm run dev
```

> ⚠️ **Important:** `npx prisma generate` **must** be run after `npm install` and any time the active Prisma schema changes (configured in `prisma.config.ts`, currently `schema/schema.prisma`). Skipping this step will cause the server to crash with a `Cannot find module '.prisma/client/default'` error.

The server starts on **http://localhost:4001** by default.

| URL | What it is |
|-----|-----------|
| `http://localhost:4001/api/health` | Health check |
| `http://localhost:4001/api/docs` | Swagger UI — full interactive API docs |

---

## Environment Variables

The setup wizard writes `.env` for you automatically. To configure manually:

```bash
cp .env.example .env
# then edit .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `PORT` | `4001` | Server port |
| `NODE_ENV` | `development` | `development` or `production` |
| `JWT_SECRET` | — | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | `24h` | Token lifetime |
| `CORS_ORIGIN` | `*` | Allowed CORS origin(s) |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP host for password-reset emails (optional) |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP app password / API key |
| `SMTP_FROM` | — | From address for emails (e.g. "SVP Analytics <no-reply@example.com>") |

> SMTP settings are **optional** — only needed if you want to test the password-reset email flow. If you use Gmail, prefer an App Password (2FA) or OAuth2; for production use a transactional provider (SendGrid/Mailgun/Amazon SES) and verify your sending domain.

---

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (auto-restarts on changes) |
| `npm start` | Start production server |
| `npm run setup` | **First-time interactive setup wizard** |
| `npm run db:seed:admins` | Seed only chapters + admin users |
| `npm run db:seed:partners` | Seed partner login accounts for all partners with email addresses |
| `npm run db:seed:dummy` | Seed dummy data for non-admin entities |
| `npm run db:seed` | Run both seeders in sequence |
| `npm run swagger` | Generate the Swagger/OpenAPI spec used by the UI |

---

## Database Schema

The schema is applied in two files:

| File | Contents |
|------|----------|
| `schema/db-schema-v1.0.sql` | Core tables: `chapters`, `partners`, `investees`, `groups`, `group_partners`, `appointments`, `appointment_partners`, `users` |
| `schema/db-schema-v1.1.sql` | Recurring appointments: `recurring_appointments`, `recurring_appointment_partners` |
| `schema/db-schema-v1.2.sql` | Attendance metadata for `appointment_partners` |
| `schema/db-schema-v1.3.sql` | Partner login linkage via `users.partner_id` |
| `schema/db-schema-v1.4.sql` | Name fields for `appointments` and `recurring_appointments` |

`npm run setup` applies all schema files automatically in order.

---

## Project Structure

```
backend/
├── package.json                  Dependencies + npm scripts
├── prisma.config.ts              Prisma configuration
├── swagger.js                    Swagger spec generator
├── swagger_output.json           Generated Swagger/OpenAPI output
├── schema/
│   ├── db-schema-v1.0.sql        Base schema
│   ├── db-schema-v1.1.sql        Recurring appointments migration
│   ├── db-schema-v1.2.sql        Attendance metadata migration
│   ├── db-schema-v1.3.sql        Partner login linkage migration
│   ├── db-schema-v1.4.sql        Appointment name columns migration
│   └── schema.prisma             SQL-first schema snapshot
├── SWAGGER_TESTING_GUIDE.md      Guide to testing via Swagger UI
│
├── scripts/                      Developer utility scripts
│   ├── setup.js                  Interactive setup wizard (new/existing modes)
│   ├── seed-admin-chapters.js    Seeds chapters + admin users only
│   ├── seed-dummy-data.js        Seeds dummy data for all other entities + partner login accounts
│   └── seed-partner-users.js     Seeds partner login accounts for existing partners
│
└── src/                          Application source
    ├── index.js                  Express app entry point
    │
    ├── config/
    │   ├── index.js              Reads env vars, exports config object
    │   ├── database.js           pg connection pool (used by scripts)
    │   └── prisma.js             Prisma Client (used by all repositories)
    │
    ├── controllers/              Request parsing → service/repo call → response
    │   ├── authController.js
    │   ├── partnerController.js
    │   ├── investeeController.js
    │   ├── groupController.js
    │   ├── appointmentController.js
    │   ├── recurringAppointmentController.js
    │   └── index.js              Barrel export
    │
    ├── routes/                   Route definitions (with Swagger JSDoc)
    │   ├── auth.js
    │   ├── chapters.js
    │   ├── partners.js
    │   ├── investees.js
    │   ├── groups.js
    │   ├── appointments.js
    │   ├── recurringAppointments.js
    │   └── lookups.js
    │
    ├── repositories/             All DB queries via Prisma (data access layer)
    │   ├── chapterRepository.js
    │   ├── partnerRepository.js
    │   ├── investeeRepository.js
    │   ├── groupRepository.js
    │   ├── appointmentRepository.js
    │   ├── recurringAppointmentRepository.js
    │   ├── userRepository.js
    │   └── index.js              Barrel export
    │
    ├── services/                 Business logic
    │   ├── authService.js        Login, password hashing, JWT issuance
    │   ├── materializationService.js  Expand recurring → concrete appointments
    │   └── index.js
    │
    ├── middleware/
    │   ├── auth.js               JWT authenticate / optionalAuth
    │   └── errorHandler.js       Global error handler (last middleware)
    │
    ├── jobs/                     Background job code (cron runner)
    │   └── materializeCron.js    Cron job — auto-materializes recurring appointments
    │
    └── utils/
        └── helpers.js            Shared utility functions (date/time formatting, Prisma helpers)
```

### Current API areas

- Auth, Chapters, Partners, Investees, Groups
- Appointments and recurring appointments
- Lookups and analytics
- Partner-scoped appointment access, notifications, and materialization

### Repo navigation

- Root overview: [../../README.md](../../README.md)
- Frontend docs: [../frontend/README.md](../frontend/README.md)

---

## API Overview

All endpoints are prefixed with `/api`. Full interactive docs at `/api/docs`.

| Resource | Base Path | Description |
|----------|-----------|-------------|
| Auth | `/api/auth` | Login, logout, forgot-password |
| Chapters | `/api/chapters` | Chapter management |
| Partners | `/api/partners` | Partner CRUD + filtering |
| Investees | `/api/investees` | Investee (NGO) CRUD |
| Groups | `/api/groups` | Group management + partner membership |
| Appointments | `/api/appointments` | Appointment scheduling + attendance |
| Recurring Appts | `/api/recurring-appointments` | Recurring templates + materialization |
| Appointment Alerts | `/api/appointments/notifications` | Overdue pending meetings assigned to the current user |
| Lookups | `/api/group-types`, `/api/appointment-types` | Lookup type management |

### Authentication

```
POST /api/auth/login
{ "email": "...", "password": "..." }
→ { "token": "<jwt>" }
```

Partner accounts use the same login endpoint. When a user is stored with `user_type = PARTNER`, the JWT and `/api/auth/me` response include the linked partner profile so the frontend can automatically scope calendar, analytics, and notifications.

Pass the token as a header on subsequent requests:
```
Authorization: Bearer <token>
```

---

## Password reset flow (overview)

Briefly, how password reset works in this backend:

1. User requests password reset by POSTing their email to `/api/auth/forgot-password`.
2. Backend validates the request and updates credentials according to the auth service flow.
3. If SMTP is configured, email delivery is attempted using the configured SMTP transport.
4. For exact behavior and payloads, refer to `/api/docs` for the active endpoint contract.

---

## Seeded Test Accounts

After `npm run setup` (and selecting admin seeding) or `npm run db:seed:admins`, chapter and admin accounts are created from `scripts/seed-admin-chapters.js`.

After `npm run db:seed:dummy`, all non-admin entities are populated with realistic dummy data (Hyderabad-heavy distribution) for testing.

Dummy partner login accounts are also created during the dummy-data seed. You can also run `npm run db:seed:partners` to create or refresh partner logins for any existing partner records. The default password for seeded partner accounts is `partner123` unless `DEFAULT_PARTNER_PASSWORD` is set.

---

## Notes & Recommendations

- Keep `.env` and any credentials out of source control — use a secrets manager in production.
- Use a transactional email provider in production for better deliverability and domain verification.
- Materialization of recurring appointments is implemented in `services/materializationService.js` and can be triggered automatically by `jobs/materializeCron.js`.

---

If you want, I can also update `.env.example` to include `FRONTEND_URL` and `PASSWORD_RESET_EXPIRES_MINUTES` entries.
