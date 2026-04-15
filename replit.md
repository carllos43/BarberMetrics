# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains the **BarberMetrics** SaaS — a professional tool for barbers to control haircut time, register appointments, analyze productivity, and manage personal finances. Optimized for mobile use.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/barber-metrics) — served at `/`
- **API framework**: Express 5 (artifacts/api-server) — served at `/api`
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **UI**: Tailwind CSS, Radix UI, Recharts, Framer Motion

## Key Features

- **Dashboard**: Real-time today stats — clients, gross revenue, barber earnings (60%), avg duration, earnings/hour, daily goal progress
- **Timer**: Haircut stopwatch with 20/25 min alerts; finish flow with service selection
- **Appointments**: History with period filter (today/week/month/year)
- **Productivity**: Analytics with service breakdown chart, idle time analysis, smart tips
- **Finances**: Monthly bill management, financial projection, surplus/shortfall tracking

## Database Tables

- `appointments` — haircut records with time, service, value, barber earnings
- `bills` — monthly fixed expenses
- `timer_sessions` — active timer tracking
- `settings` — key-value config (daily_goal, hours_per_day, days_per_week)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Business Logic

- Barber earnings = value × 0.60
- Productivity period filters: today / week / month / year
- Smart tips generated dynamically based on data patterns
- Financial projection: avg daily earnings × remaining days in month
