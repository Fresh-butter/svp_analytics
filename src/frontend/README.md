# SVP Analytics — Frontend

React single-page application for the **SVP Partner Engagement Dashboard** — view and manage partners, investees, groups, appointments, and analytics for SVP chapters.

- **Framework:** React 18 (Vite + TypeScript)
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM v6
- **Charts:** Chart.js & react-chartjs-2
- **Icons:** Lucide React

---

## Quick Start

### Prerequisites

| Tool       | Version           |
| ---------- | ----------------- |
| Node.js    | ≥ 18              |
| npm        | ≥ 9               |
| Backend    | Running on `:4001` (see `../backend/README.md`) |

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

The app starts on **http://localhost:5173** by default.

> ⚠️ **Important:** The backend must be running on port `4001` before starting the frontend. The Vite dev server proxies all `/api` requests there automatically.

---

## npm Scripts

| Script           | Description                                      |
| ---------------- | ------------------------------------------------ |
| `npm run dev`    | Start Vite dev server with hot reload            |
| `npm run build`  | Type-check with `tsc` then build for production  |
| `npm run preview`| Preview the production build locally             |
| `npm run lint`   | Run ESLint on all `.ts` / `.tsx` files           |

---

## Project Structure

```
frontend/
├── index.html                Vite entry HTML
├── package.json              Dependencies + npm scripts
├── postcss.config.js         PostCSS / Tailwind setup
├── tailwind.config.js        Tailwind theme + custom colors
├── tsconfig.json             TypeScript config (app)
├── tsconfig.node.json        TypeScript config (Vite/Node)
├── vite.config.ts            Vite config (proxy, aliases)
│
├── public/
│   └── svp_logo.png          App logo / favicon
│
└── src/
    ├── main.tsx              App entry point (React + Router + Providers)
    ├── App.tsx               Route definitions + PrivateRoute guard
    ├── index.css             Global styles + Tailwind directives + theme vars
    ├── vite-env.d.ts         Vite/ImportMeta type declarations
    │
    ├── components/           Reusable UI elements
    │   ├── Common.tsx        Shared UI primitives (Modals, Buttons, Cards)
    │   ├── Layout.tsx        App shell — sidebar + topbar + content area
  │   ├── StatusBadge.tsx   Status pills for appointments / active records
    │   ├── TimePicker.tsx    Custom time picker input
  │   ├── CreateAppointmentModal.tsx
  │   ├── CreateRecurringModal.tsx
  │   ├── GroupSelectorModal.tsx
  │   ├── PartnerSelectorModal.tsx
    │   └── analytics/        Chart & table components for the Analytics page
    │       ├── analyticsTypes.ts
    │       ├── AttendanceByPartner.tsx
    │       ├── InvesteeAnalytics.tsx
    │       ├── MetricsByCategory.tsx
    │       ├── MonthlyEngagement.tsx
    │       └── SharedAnalyticsTable.tsx
    │
    ├── pages/                Main application views
    │   ├── Home.tsx          Dashboard home
    │   ├── Login.tsx         Login page
    │   ├── Partners.tsx      Partner management
    │   ├── Investees.tsx     Investee (NGO) management
    │   ├── Groups.tsx        Group management
    │   ├── Appointments.tsx  Admin appointment list
    │   ├── RecurringAppointments.tsx
    │   ├── AppointmentView.tsx
    │   ├── RecurringAppointmentView.tsx
    │   ├── Calendar.tsx      Appointment calendar
    │   └── Analytics.tsx     Charts + engagement analytics
    │
    ├── services/             API interaction layer (one file per backend controller)
    │   ├── api.ts            Base fetch wrapper + JWT token management
    │   ├── authService.ts    Login / logout / me
    │   ├── partnerService.ts
    │   ├── investeeService.ts
    │   ├── groupService.ts
    │   ├── appointmentService.ts
    │   ├── recurringAppointmentService.ts
    │   ├── chapterService.ts
    │   └── analyticsService.ts
    │
    ├── mappers/              Backend ↔ Frontend field-name translation
    │   └── index.ts          All mapper functions + backend interface types
    │
    ├── context/              React Contexts
    │   ├── AuthContext.tsx    JWT auth state + login/logout actions
    │   └── ThemeContext.tsx   Light/Dark theme toggle
    │
    ├── hooks/                React Query and form hooks
    │   ├── useAppointments.ts
    │   ├── useRecurringAppointments.ts
    │   ├── useInvestees.ts
    │   ├── useGroups.ts
    │   ├── usePartners.ts
    │   └── useAppointmentForm.ts
    │
    ├── types/                Shared TypeScript interfaces
    │   └── index.ts          Partner, Investee, Group, Appointment, etc.
    │
    └── utils/                Helper functions
      ├── search.ts         Fuzzy/filtered search algorithms
      ├── recurrence.ts     Recurring event expansion logic
      ├── calendarLegacy.ts  Calendar compatibility helpers
      └── formatters.ts     Date/time formatting helpers
```

  ### Current page set

  - Admin: Home, Partners, Investees, Groups, Appointments, Recurring Appointments, Calendar, Analytics
  - Partner: My Appointments, Explore views, Calendar, Analytics

  ### Repo navigation

  - Root overview: [../../README.md](../../README.md)
  - Backend docs: [../backend/README.md](../backend/README.md)

---

## Connecting to Backend

The `vite.config.ts` proxies all requests starting with `/api` to `http://localhost:4001`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:4001',
      changeOrigin: true,
    },
  },
}
```

All API calls go through `src/services/api.ts`, which:
1. Prepends the base URL (`/api/v1`)
2. Attaches the JWT `Authorization` header from local storage
3. Handles error responses uniformly

---

## Authentication Flow

1. User submits credentials on `/login`
2. `authService.login()` calls `POST /api/v1/auth/login` → receives a JWT
3. Token is stored in `localStorage` via `setToken()`
4. `AuthContext` provides `user` state to the entire app
5. `PrivateRoute` redirects unauthenticated users to `/login`
6. On logout, the token is cleared and state is reset

---

## Building for Production

```bash
npm run build
```

Output is written to `dist/`. Serve it with any static file server:

```bash
npm run preview        # quick local preview
# — or —
npx serve dist         # serve with the 'serve' package
```

> In production, configure your web server / reverse proxy to forward `/api` requests to the backend and serve everything else from `dist/`.
