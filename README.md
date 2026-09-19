# LOOP — AI Customer-Feedback Intelligence Platform

> *"Close the loop on customer feedback."*

Project LOOP is a corporate-grade multi-tenant web application designed to help modern SaaS companies make sense of customer feedback arriving across support tickets, app-store reviews, NPS surveys, sales notes, and community posts. It automates classification, theme clustering, trend and spike detection, grounded natural-language Q&A (Ask LOOP), and executive Voice-of-Customer (VoC) report generation.

---

## Current Phase

**Phase 2 — Authentication & RBAC**

Multi-tenant credentials authentication is established using **NextAuth.js (Auth.js)**, salted **bcrypt** password hashing, atomic workspace signup, persistent JWT sessions, and server-side role authorization (`ADMIN`, `ANALYST`, `VIEWER`).

---

## Current Status

> [!NOTE]
> **Authentication, workspace isolation, and RBAC are implemented and verified.**
> In accordance with the Phase 2 specification, feedback ingestion, analytics dashboards, and AI services will follow in subsequent phases.

---

## Tech Stack

Derived strictly from `Zidio_Project_Web_1.1.pdf`:

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict typing)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Neon / Supabase)
- **ORM**: Prisma ORM (v5.22.0 LTS)
- **Authentication**: NextAuth.js (Auth.js v4) + bcryptjs
- **AI Intelligence**: Anthropic Claude API (`claude-sonnet-4-6` / Sonnet) *(Phase 6+)*
- **Embeddings & Search**: Vector embeddings (pgvector / hosted provider) *(Phase 8)*
- **Visualizations**: Recharts *(Phase 5)*
- **Validation**: Zod
- **Deployment**: Vercel + Hosted PostgreSQL

---

## Role-Based Access Control (RBAC) & Permissions Matrix

| Capability / Resource | ADMIN | ANALYST | VIEWER |
| :--- | :---: | :---: | :---: |
| Access Authenticated App (`/dashboard`) | ✅ | ✅ | ✅ |
| View Workspace Intelligence & Feedback | ✅ | ✅ | ✅ |
| View Team Members (`/settings/members`) | ✅ | ❌ | ❌ |
| Modify Teammate Roles (Admin/Analyst/Viewer) | ✅ | ❌ | ❌ |
| Create / Ingest Feedback *(Phase 3)* | ✅ | ✅ | ❌ |
| Triage & Update Feedback Status *(Phase 4)* | ✅ | ✅ | ❌ |
| Generate Voice-of-Customer Reports *(Phase 9)*| ✅ | ✅ | ❌ |

> **Security Rule**: RBAC is strictly enforced server-side via API authorization guards (`requireRole`). Client-side UI element hiding is purely cosmetic; forbidden requests return HTTP `403 Forbidden`.

---

## Demo Credentials (Local / Staging Only)

The seeded demo workspace comes pre-configured with three role accounts for testing and evaluation:

| Role | Email | Password | Scope / Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@loop.demo` | `DemoPass123!` | Full workspace administration & member role management |
| **ANALYST** | `analyst@loop.demo` | `DemoPass123!` | Feedback ingestion, triage, and reclassification |
| **VIEWER** | `viewer@loop.demo` | `DemoPass123!` | Read-only access to feedback intelligence and dashboards |

*(Passwords are stored strictly as salted bcrypt one-way hashes; passwordHash is never returned to clients or embedded in session tokens).*

---

## Project Structure

```text
loop/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx        # Login screen with validation & demo credentials hint
│   │   └── signup/
│   │       └── page.tsx        # Signup screen with atomic workspace creation
│   ├── (app)/
│   │   ├── layout.tsx          # Authenticated app shell layout
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Authenticated overview with role privileges summary
│   │   └── settings/
│   │       └── members/
│   │           └── page.tsx    # Admin member management and role modification
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/
│   │   │   │   └── route.ts    # NextAuth route handler
│   │   │   └── signup/
│   │   │       └── route.ts    # Atomic Workspace + Admin User creation
│   │   ├── health/
│   │   │   └── route.ts        # Smoke-check health endpoint verifying DB readiness
│   │   └── members/
│   │       ├── route.ts        # GET workspace members (scoped by workspaceId)
│   │       └── [id]/
│   │           └── route.ts    # PATCH member role (ADMIN only + tenant isolation)
│   ├── layout.tsx              # Root layout with local fonts and AuthProvider
│   ├── page.tsx                # Phase 2 status landing page
│   └── globals.css             # Tailwind CSS directives
├── components/
│   ├── layout/
│   │   └── AppNavbar.tsx       # Top navbar with active workspace indicator and role badge
│   └── providers/
│       └── AuthProvider.tsx    # NextAuth SessionProvider client wrapper
├── lib/
│   ├── auth.ts                 # NextAuth options, session retrieval, and requireRole guards
│   ├── db.ts                   # Centralized Prisma Client singleton
│   ├── utils.ts                # Tailwind merge utility
│   └── validations/
│       └── auth.ts             # Zod schemas for login, signup, and role updates
├── middleware.ts               # Next.js edge route protection & redirection guard
├── prisma/
│   ├── migrations/
│   │   └── 0_init/
│   │       └── migration.sql   # Pristine SQL DDL for PostgreSQL
│   ├── schema.prisma           # Prisma schema with models, enums, & indexes
│   └── seed.ts                 # Deterministic Phase 1 foundation seed script
├── scripts/
│   ├── verify-db.ts            # Schema and delegate verification script
│   └── verify-auth-rbac.ts     # Automated authentication and RBAC test suite
├── types/
│   ├── index.ts                # Re-exported Prisma types & WorkspaceScoped contract
│   └── next-auth.d.ts          # Typed NextAuth session with role and workspaceId
├── .env.example                # Documented template for required environment variables
├── .gitignore                  # Git ignore rules protecting secrets and build artifacts
├── next.config.mjs             # Next.js configuration
├── package.json                # Project dependencies and npm scripts
├── postcss.config.mjs          # PostCSS configuration
├── tailwind.config.ts          # Tailwind CSS design system tokens
├── tsconfig.json               # Strict TypeScript configuration
└── README.md                   # Project documentation
```

---

## Local Setup

### 1. Installation
```bash
git clone https://github.com/Sumit-217/LOOP.git
cd LOOP
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://user:password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
NEXTAUTH_SECRET="a-secure-random-32-character-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Migration & Seed
```bash
# Apply migrations
npm run db:migrate

# Seed baseline demo workspace & 3 role users
npm run db:seed
```

### 4. Running Verification Tests
```bash
# Verify schema & delegates
npx tsx scripts/verify-db.ts

# Verify authentication, signup, RBAC, and tenant isolation
npx tsx scripts/verify-auth-rbac.ts
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Upcoming Phases

1. ~~Phase 0 — Project Foundation~~ *(Complete)*
2. ~~Phase 1 — Database & Multi-Tenancy Foundation~~ *(Complete)*
3. ~~Phase 2 — Authentication & RBAC~~ *(Complete)*
4. **Phase 3 — Feedback Ingestion**: Single entry form, CSV bulk parser with summary, simulated channel generator, and complete 120+ seed dataset.
5. **Phase 4 — Feedback Inbox**: Server-side pagination, multi-filter query builder, full-text search, inline status triage.
6. **Phase 5 — Analytics Dashboard**: Recharts data visualizations (volume, sentiment, themes), key stat cards, responsive layouts.
7. **Phase 6 — AI Classification**: Claude API integration, structured Zod parsing, sentiment scoring, feature area tagging, re-classify action.
8. **Phase 7 — Themes & Trends**: Feedback theme clustering, spike detection algorithm, theme drill-down navigation.
9. **Phase 8 — Ask LOOP**: Vector embedding pipeline, pgvector semantic similarity search, grounded Claude Q&A with citations.
10. **Phase 9 — Voice-of-Customer**: Pre-computed metrics, Claude executive narrative generation, report persistence, print/PDF export.
11. **Phase 10 — Production Hardening**: Multi-tenancy isolation audit, RBAC security verification, demo credentials, video walkthrough, and final submission.
