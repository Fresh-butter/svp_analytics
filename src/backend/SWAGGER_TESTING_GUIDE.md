# Swagger + API Exhaustive Testing Guide

This guide defines a **full API validation plan** for the backend, with extra depth for:
- **Timestamp handling (IST conversion)**
- **Recurring appointment lifecycle + materialization**

It is designed for manual execution in Swagger UI and/or scripted execution with `curl`.

---

## 1) Test Objective

Validate that all backend APIs are:
1. Functionally correct (CRUD + filters + validations)
2. Secure (auth required where expected)
3. Data-consistent (relationships and constraints)
4. Time-correct (IST inputs are stored/rendered correctly)
5. Recurrence-correct (RRule + range + idempotent materialization)

---

## 2) Prerequisites

1. Install dependencies and generate Prisma client:

```bash
npm install
npx prisma generate
```

2. Start backend:

```bash
npm run dev
```

3. Open Swagger:
- http://localhost:4001/api/docs

4. Seed/setup DB if needed:

```bash
npm run setup
# or
npm run db:seed
```

---

## 3) Global Test Conventions

- Base URL: `http://localhost:4001/api`
- Auth header: `Authorization: Bearer <token>`
- Prefer one chapter for deterministic tests.
- For destructive tests (`DELETE`), use dedicated test records.
- Capture IDs from create responses into variables:
  - `CHAPTER_ID`, `PARTNER_ID`, `INVESTEE_ID`, `GROUP_ID`
  - `APPOINTMENT_TYPE_ID`, `GROUP_TYPE_ID`
  - `APPOINTMENT_ID`, `REC_APPOINTMENT_ID`

---

## 4) API Coverage Matrix (All Endpoints)

## Auth
- `POST /api/auth/login`
  - Valid credentials -> `200`
  - Missing password/email -> `400`
  - Wrong credentials -> `401`
- `POST /api/auth/forgot-password`
  - Existing email -> `200`
  - Non-existing email -> `200` (anti-enumeration)
  - Missing email -> `400`
- `POST /api/auth/logout` (auth)
  - Valid token -> `200`
  - Missing/invalid token -> `401`
- `GET /api/auth/me` (auth)
  - Valid token -> `200`
  - Missing/invalid token -> `401`

## Chapters
- `GET /api/chapters` -> non-empty list, shape validation
- `GET /api/chapters/:id`
  - Existing -> `200`
  - Non-existing -> `404`

## Lookups
- Group Types:
  - `GET /api/group-types`
  - `POST /api/group-types` (valid + duplicate handling)
  - `DELETE /api/group-types/:id` (unreferenced `200`, referenced `409`)
- Appointment Types:
  - `GET /api/appointment-types`
  - `POST /api/appointment-types` (valid + duplicate handling)
  - `DELETE /api/appointment-types/:id` (unreferenced `200`, referenced `409`)

## Partners
- `GET /api/partners` with `active=true/false`, `primary=...`
- `GET /api/partners/:id` with month/year filters
- `POST /api/partners` (required fields + duplicate email `409`)
- `PUT /api/partners/:id` (partial update)
- `DELETE /api/partners/:id` (referenced `409`, unreferenced `200`)

## Investees
- `GET /api/investees` with `active=true/false`
- `GET /api/investees/:id` with month/year filters
- `POST /api/investees` (required fields)
- `PUT /api/investees/:id` (partial update)
- `DELETE /api/investees/:id` (referenced `409`, unreferenced `200`)

## Groups
- `GET /api/groups` with `active=true/false`, `group_type=...`
- `GET /api/groups/:id` (members present)
- `POST /api/groups` (required fields)
- `PUT /api/groups/:id` (date-boundary updates)
- `PUT /api/groups/:id/partners`
  - Overwrite partners success
  - Duplicate partner payload -> `409`
  - Invalid date order (`start_date > end_date`) -> validation failure
- `DELETE /api/groups/:id` (referenced `409`, unreferenced `200`)

## Appointments
- `GET /api/appointments` default current month/year
- `GET /api/appointments?month=...&year=...`
- `GET /api/appointments/:id` includes investee + recurring + partners
- `POST /api/appointments` (time/date combinations)
- `PUT /api/appointments/:id` (status/time/partners update)
- `PATCH /api/appointments/:id/complete` (attendance required)
- `DELETE /api/appointments/:id`

## Recurring Appointments
- `GET /api/recurring-appointments`
- `GET /api/recurring-appointments/:id`
- `POST /api/recurring-appointments`
  - Valid rrule/time/range -> `201`
  - Invalid rrule -> `400`
  - `end_date` > 1 year horizon -> `400`
- `PUT /api/recurring-appointments/:id`
  - Valid partial update -> `200`
  - Invalid rrule -> `400`
- `POST /api/recurring-appointments/:id/materialize`
  - Valid occurrence -> `201`
  - Duplicate occurrence -> `409`
  - Out-of-range date -> `400`
  - Date not matching rrule -> `400`
- `DELETE /api/recurring-appointments/:id`
  - Template removed and materialized appointments keep data with `rec_appointment_id = null`

---

## 5) Exhaustive Timestamp (IST) Test Suite

The backend combines `occurrence_date + time` as IST and stores UTC timestamp.

Formula under test:
- `UTC = IST - 05:30`

### Required Cases

1. **Standard daytime**
   - Input: `2026-03-17`, `09:00:00` IST
   - Expected UTC: `2026-03-17T03:30:00.000Z`

2. **Midnight boundary**
   - Input: `2026-03-17`, `00:00:00` IST
   - Expected UTC: `2026-03-16T18:30:00.000Z`

3. **Late night**
   - Input: `2026-03-17`, `23:59:59` IST
   - Expected UTC: `2026-03-17T18:29:59.000Z`

4. **End before start same day (should still validate business rule if applicable)**
   - Create/update with invalid ranges and confirm API validation behavior.

5. **ISO timestamp passthrough paths**
   - For endpoints accepting full ISO `start_at/end_at`, verify values are not double-shifted.

6. **Cross-date duration**
   - Start near midnight with duration crossing to next day; ensure `end_at` is correct.

### How to Verify

- API response fields:
  - `start_at`, `end_at` (ISO UTC)
  - `occurrence_date` (date-only)
- DB verification (optional):

```sql
SELECT appointment_id, occurrence_date, start_at, end_at
FROM appointments
WHERE appointment_id = '<APPOINTMENT_ID>';
```

---

## 6) Exhaustive Recurring + Materialization Test Suite

### A. Template Creation Coverage

Test these RRULE patterns:
- Weekly: `FREQ=WEEKLY;BYDAY=MO`
- Weekly multi-day: `FREQ=WEEKLY;BYDAY=MO,WE,FR`
- Monthly nth-day: `FREQ=MONTHLY;BYDAY=2TU`
- Biweekly-style monthly pattern used by UI: `FREQ=MONTHLY;BYDAY=1MO,3MO`

For each pattern, verify:
- Create success (`201`)
- `start_time`, `duration_minutes`, `start_date`, `end_date` persisted correctly
- Optional links (`group_id`, `investee_id`, `partners`) persisted

### B. Materialization Coverage

For a template, call:
- `POST /api/recurring-appointments/:id/materialize`

Cases:
1. Valid occurrence in range + matching rule -> `201`
2. Same occurrence repeated -> `409 ALREADY_EXISTS`
3. Date before template `start_date` -> `400`
4. Date after template `end_date` -> `400`
5. Date in range but not matching rrule -> `400`

### C. Partner Snapshot Rules

When materializing:
- Active partners from template group are copied
- Active partners from `recurring_appointment_partners` are copied
- Deduplication applies (same partner only once)

Assertions:
- `appointment_partners` row count equals unique active partners
- No duplicates for same `(appointment_id, partner_id)`

### D. Template Update/Delete Behavior

- `PUT /api/recurring-appointments/:id` affects future/unmaterialized occurrences only
- `DELETE /api/recurring-appointments/:id`
  - Template removed
  - Existing materialized appointments remain
  - Their `rec_appointment_id` becomes `null`

---

## 7) Negative + Security Test Set

For every authenticated route:
1. No token -> `401`
2. Malformed token -> `401`
3. Expired token (if available) -> `401`

Validation errors to include:
- Missing required fields (`400`)
- Invalid enum/status values (`400`)
- Invalid date/time format (`400`)
- Entity not found (`404`)
- Reference constraints (`409`)

---

## 8) Suggested Execution Order (Deterministic)

1. Login -> get token
2. Fetch chapters/lookups
3. Create partner + investee
4. Create group and assign partners
5. Create single appointment and verify time conversion
6. Complete appointment with attendance
7. Create recurring template
8. Materialize valid and invalid dates
9. Update recurring template
10. Delete recurring template and verify link nullification
11. Cleanup created entities in reverse dependency order

---

## 9) Minimal Evidence Checklist

Record for each endpoint tested:
- Request payload
- HTTP status
- Key response fields
- DB assertion (if applicable)
- Pass/Fail + notes

Use this table format:

| Endpoint | Scenario | Expected | Actual | Result | Notes |
|---|---|---|---|---|---|
| POST /api/appointments | IST 09:00 case | 201 + UTC 03:30 | ... | PASS/FAIL | ... |

---

## 10) Quick Commands

Regenerate Swagger after route-doc edits:

```bash
npm run swagger
```

---

## 11) Notes

- Source of truth for endpoint contracts remains Swagger (`/api/docs`) and route files.
- Timestamp correctness is critical for analytics and calendar views; always run Section 5 when touching appointment or recurrence logic.
- Recurring tests should be re-run after any change in:
  - `src/services/materializationService.js`
  - `src/repositories/appointmentRepository.js`
  - `src/repositories/recurringAppointmentRepository.js`
  - `src/utils/helpers.js`

---

## 12) Seed-Referred Concrete Test Cases (Ready to Run)

These test cases are based on the current split seeding flow:
- `scripts/seed-admin-chapters.js`
- `scripts/seed-dummy-data.js`

### Seed facts used

- Admin logins are defined in `scripts/seed-admin-chapters.js`.
- Chapters seeded by default:
  - `SVP India - Hyderabad`
  - `SVP India - Bangalore`
- Dummy data includes realistic partners/investees/groups/appointments for both chapters,
  with higher data density in Hyderabad.

### Step 0: Resolve IDs from seed names

Run these once and store values as environment variables in your API client:

```sql
-- Chapter
SELECT chapter_id, chapter_name FROM chapters WHERE chapter_name IN ('SVP India - Hyderabad', 'SVP India - Bangalore');

-- Appointment / Group types
SELECT appointment_type_id, type_name FROM appointment_types ORDER BY type_name;
SELECT group_type_id, type_name FROM group_types ORDER BY type_name;

-- Partners
SELECT partner_id, partner_name, chapter_id FROM partners ORDER BY created_at DESC LIMIT 20;

-- Investees
SELECT investee_id, investee_name, chapter_id FROM investees ORDER BY created_at DESC LIMIT 20;

-- Groups
SELECT group_id, group_name, chapter_id FROM groups ORDER BY created_at DESC LIMIT 20;

-- Seed recurring templates
SELECT rec_appointment_id, rrule, start_time, start_date, end_date
FROM recurring_appointments
ORDER BY created_at;
```

---

### TC-S01: Login with seeded admin

- Endpoint: `POST /api/auth/login`
- Body:

```json
{ "email": "admin@svp.org", "password": "admin123" }
```

- Expect:
  - `200`
  - `data.token` present
  - `data.user.email = admin@svp.org`

### TC-S02: `/auth/me` with token

- Endpoint: `GET /api/auth/me`
- Header: `Authorization: Bearer <token>`
- Expect:
  - `200`
  - `data.email = admin@svp.org`
  - `data.password_hash` not exposed

### TC-S03: Seed partner details lookup

- Endpoint: `GET /api/partners`
- Query: `active=true`
- Expect:
  - `200`
  - Includes `Rahul Mehta`, `Sneha Desai`
  - Excludes ended partner `Geeta Gupta` from active list (end date in 2024)

### TC-S04: Seed investee lookup

- Endpoint: `GET /api/investees?active=true`
- Expect:
  - `200`
  - Includes `Teach For India - Bengaluru`

### TC-S05: Timestamp conversion (09:00 IST -> 03:30Z)

- Endpoint: `POST /api/appointments`
- Body:

```json
{
  "chapter_id": "<CHAPTER_ID>",
  "occurrence_date": "2026-03-17",
  "start_at": "09:00:00",
  "end_at": "10:00:00",
  "appointment_type_id": "<REVIEW_MEETING_TYPE_ID>",
  "group_type_id": "<MENTORSHIP_GROUP_TYPE_ID>",
  "investee_id": "<TFI_INVESTEE_ID>",
  "partner_ids": ["<RAHUL_ID>", "<SNEHA_ID>"]
}
```

- Expect:
  - `201`
  - `data.start_at = 2026-03-17T03:30:00.000Z`
  - `data.end_at = 2026-03-17T04:30:00.000Z`

### TC-S06: Midnight boundary conversion (00:00 IST)

- Endpoint: `POST /api/appointments`
- Body same as TC-S05 but:
  - `occurrence_date = 2026-03-17`
  - `start_at = 00:00:00`
  - `end_at = 00:30:00`

- Expect:
  - `201`
  - `data.start_at = 2026-03-16T18:30:00.000Z`
  - `data.end_at = 2026-03-16T19:00:00.000Z`

### TC-S07: Late-night conversion (23:59:59 IST)

- Endpoint: `POST /api/appointments`
- Body same as TC-S05 but:
  - `start_at = 23:59:59`
  - `end_at = 23:59:59`

- Expect:
  - `201`
  - `data.start_at = 2026-03-17T18:29:59.000Z`

### TC-S08: Seed recurring template list verification

- Endpoint: `GET /api/recurring-appointments`
- Expect:
  - `200`
  - One record with `rrule = FREQ=MONTHLY;BYMONTHDAY=15`
  - One record with `rrule = FREQ=WEEKLY;BYDAY=FR`

### TC-S09: Materialize seeded monthly recurring on valid date

- Pick seeded monthly template `REC_MONTHLY_ID` (`BYMONTHDAY=15`, Jan-Jun 2026).
- Endpoint: `POST /api/recurring-appointments/<REC_MONTHLY_ID>/materialize`
- Body:

```json
{ "occurrence_date": "2026-03-15" }
```

- Expect:
  - `201`
  - `data.occurrence_date = 2026-03-15`
  - `data.status = PENDING`
  - `data.start_at = 2026-03-15T08:30:00.000Z` (14:00 IST)

### TC-S10: Materialize duplicate occurrence

- Repeat TC-S09 with same template/date.
- Expect:
  - `409`
  - `error.code = ALREADY_EXISTS`

### TC-S11: Materialize date outside range

- For same monthly template (`start_date=2026-01-01`, `end_date=2026-06-30`), call:

```json
{ "occurrence_date": "2026-07-15" }
```

- Expect:
  - `400`
  - message contains `within the template date range`

### TC-S12: Materialize non-occurrence date inside range

- For same monthly-by-15 template, call:

```json
{ "occurrence_date": "2026-03-14" }
```

- Expect:
  - `400`
  - message contains `not a valid occurrence per the rrule`

### TC-S13: Weekly Friday recurring materialization positive

- Pick seeded weekly template `REC_FRIDAY_ID` (`FREQ=WEEKLY;BYDAY=FR`, 10:00 IST).
- Endpoint: `POST /api/recurring-appointments/<REC_FRIDAY_ID>/materialize`
- Body:

```json
{ "occurrence_date": "2026-03-27" }
```

- Expect:
  - `201`
  - `data.start_at = 2026-03-27T04:30:00.000Z` (10:00 IST)

### TC-S14: Weekly Friday recurring negative (non-Friday)

- Same template as TC-S13.
- Body:

```json
{ "occurrence_date": "2026-03-26" }
```

- Expect:
  - `400`
  - invalid occurrence message

### TC-S15: Complete a PENDING appointment with attendance

- First create a PENDING appointment (or use materialized one from TC-S09/TC-S13).
- Endpoint: `PATCH /api/appointments/<APPOINTMENT_ID>/complete`
- Body:

```json
{
  "attendance": [
    { "partner_id": "<RAHUL_ID>", "is_present": true },
    { "partner_id": "<SNEHA_ID>", "is_present": false }
  ]
}
```

- Expect:
  - `200`
  - appointment status becomes `COMPLETED`
  - partner attendance values persisted

### TC-S16: Complete endpoint validation error

- Endpoint: `PATCH /api/appointments/<APPOINTMENT_ID>/complete`
- Body:

```json
{ "attendance": "invalid" }
```

- Expect:
  - `400`
  - message contains `attendance array is required`

### TC-S17: Create recurring with invalid rule

- Endpoint: `POST /api/recurring-appointments`
- Body:

```json
{
  "chapter_id": "<CHAPTER_ID>",
  "start_time": "10:00:00",
  "duration_minutes": 60,
  "rrule": "FREQ=INVALID",
  "start_date": "2026-03-01",
  "end_date": "2026-06-01",
  "appointment_type_id": "<REVIEW_MEETING_TYPE_ID>"
}
```

- Expect:
  - `400`
  - message starts with `Invalid rrule:`

### TC-S18: Create recurring with horizon violation

- Endpoint: `POST /api/recurring-appointments`
- Body with `end_date` > 1 year from test execution date.
- Expect:
  - `400`
  - message `end_date cannot be more than 1 year from today`

### TC-S19: Delete recurring template and verify link nullification

1. Create a temporary recurring template.
2. Materialize one occurrence.
3. Delete template: `DELETE /api/recurring-appointments/<TEMP_REC_ID>`.
4. Query appointment by id.

Expect:
- delete returns `200`
- materialized appointment still exists
- `rec_appointment_id = null`

### TC-S20: Unauthorized access smoke tests

For each protected route family (`/partners`, `/investees`, `/groups`, `/appointments`, `/recurring-appointments`, `/group-types`, `/appointment-types`):
- Retry one GET endpoint **without token**.
- Expect `401`.

