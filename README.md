# LOOP — AI Customer-Feedback Intelligence Platform

> *"Close the loop on customer feedback."*

Project LOOP is a corporate-grade multi-tenant web application designed to help modern SaaS companies make sense of customer feedback arriving across support tickets, app-store reviews, NPS surveys, sales notes, and community posts. It automates classification, theme clustering, trend and spike detection, grounded natural-language Q&A (Ask LOOP), and executive Voice-of-Customer (VoC) report generation.

---

## Current Phase

**Phase 1 — Database & Multi-Tenancy Foundation**

The relational data layer and multi-tenant foundation are established using **PostgreSQL** and **Prisma ORM**. All Section 07 core entities, relationships, constraints, and indexes are modeled and verified.

---

## Current Status

> [!NOTE]
> **Authentication and business functionality are not implemented yet.**
> In accordance with the Phase 1 specification, database models and multi-tenancy foundations are implemented. NextAuth authentication, feedback ingestion, UI dashboards, and AI services will follow in subsequent phases.

---

## Tech Stack

Derived strictly from `Zidio_Project_Web_1.1.pdf`:

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict typing)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Neon / Supabase)
- **ORM**: Prisma ORM (v5.22.0 LTS)
- **Authentication**: NextAuth.js (Auth.js) *(Phase 2)*
- **AI Intelligence**: Anthropic Claude API (`claude-sonnet-4-6` / Sonnet) *(Phase 6+)*
- **Embeddings & Search**: Vector embeddings (pgvector / hosted provider) *(Phase 8)*
- **Visualizations**: Recharts *(Phase 5)*
- **Validation**: Zod
- **Deployment**: Vercel + Hosted PostgreSQL

---

## Database Schema & Multi-Tenancy Architecture

The database schema strictly adheres to Section 07 of the project specification. Every tenant-owned table carries a `workspaceId` foreign key and is backed by query-optimization compound indexes.

```mermaid
erDiagram
    Workspace ||--o{ User : "has many"
    Workspace ||--o{ Feedback : "has many"
    Workspace ||--o{ Theme : "has many"
    Workspace ||--o{ Report : "has many"
    User ||--o{ Report : "generatedBy"
    Feedback ||--o{ FeedbackTheme : "categorized in"
    Theme ||--o{ FeedbackTheme : "applies to"
    Feedback ||--o| Embedding : "has one"

    Workspace {
        string id PK
        string name
        datetime createdAt
    }

    User {
        string id PK
        string name
        string email UK
        string passwordHash
        enum role "ADMIN | ANALYST | VIEWER"
        string workspaceId FK
    }

    Feedback {
        string id PK
        string content
        string channel
        string sourceRef
        string customerLabel
        enum sentiment "POS | NEU | NEG"
        float sentimentScore "-1.0 to 1.0"
        enum status "NEW | REVIEWED | ACTIONED"
        string workspaceId FK
        datetime createdAt
    }

    Theme {
        string id PK
        string name
        string description
        string color
        string workspaceId FK
    }

    FeedbackTheme {
        string feedbackId PK, FK
        string themeId PK, FK
        float confidence "0.0 to 1.0"
    }

    Embedding {
        string id PK
        string feedbackId FK, UK
        float_array vector
    }

    Report {
        string id PK
        string title
        datetime periodStart
        datetime periodEnd
        json contentJson
        string workspaceId FK
        string generatedBy FK
        datetime createdAt
    }
```

### Non-Negotiable Tenant Isolation Rule
> Every single database query that touches feedback, themes, reports, or users **MUST** be filtered by the authenticated user's `workspaceId`. A user from Company A must never be able to read a single row belonging to Company B — even by guessing an ID in the URL.

---

## Project Structure

```text
loop/
├── app/
│   ├── api/
│   │   └── health/
│   │       └── route.ts        # Smoke-check health endpoint verifying DB readiness
│   ├── layout.tsx              # Root application layout
│   ├── page.tsx                # Phase 1 database status landing page
│   └── globals.css             # Tailwind CSS directives
├── components/                 # Reusable UI components
├── lib/
│   ├── db.ts                   # Centralized Prisma Client singleton
│   └── utils.ts                # Tailwind merge and styling utilities
├── prisma/
│   ├── migrations/
│   │   └── 0_init/
│   │       └── migration.sql   # Pristine SQL DDL for PostgreSQL
│   ├── schema.prisma           # Prisma schema with models, enums, & indexes
│   └── seed.ts                 # Deterministic Phase 1 foundation seed script
├── scripts/
│   └── verify-db.ts            # Automated schema & delegate verification script
├── types/
│   └── index.ts                # Re-exported Prisma types & WorkspaceScoped contract
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

## Database Setup & Commands

### 1. Configure Connection
Place your hosted PostgreSQL connection string (from Neon or Supabase) in `.env.local`:

```env
DATABASE_URL="postgresql://user:password@ep-sample-123.neon.tech/neondb?sslmode=require"
```

### 2. Available Database Scripts
* **Generate Prisma Client**:
  ```bash
  npm run db:generate
  ```
* **Run Database Migrations**:
  ```bash
  npm run db:migrate
  ```
* **Run Foundation Seed**:
  ```bash
  npm run db:seed
  ```
* **Verify Schema & Delegates**:
  ```bash
  npx tsx scripts/verify-db.ts
  ```

---

## Local Setup

```bash
# 1. Clone & install
git clone https://github.com/Sumit-217/LOOP.git
cd LOOP
npm install

# 2. Run local dev server
npm run dev

# 3. Build for production
npm run build
```

---

## Upcoming Phases

1. ~~Phase 0 — Project Foundation~~ *(Complete)*
2. ~~Phase 1 — Database & Multi-Tenancy Foundation~~ *(Complete)*
3. **Phase 2 — Authentication & RBAC**: NextAuth credentials setup, session management, ADMIN/ANALYST/VIEWER role guards, 403 handling.
4. **Phase 3 — Feedback Ingestion**: Single entry form, CSV bulk parser with summary, simulated channel generator, and complete 120+ seed dataset.
5. **Phase 4 — Feedback Inbox**: Server-side pagination, multi-filter query builder, full-text search, inline status triage.
6. **Phase 5 — Analytics Dashboard**: Recharts data visualizations (volume, sentiment, themes), key stat cards, responsive layouts.
7. **Phase 6 — AI Classification**: Claude API integration, structured Zod parsing, sentiment scoring, feature area tagging, re-classify action.
8. **Phase 7 — Themes & Trends**: Feedback theme clustering, spike detection algorithm, theme drill-down navigation.
9. **Phase 8 — Ask LOOP**: Vector embedding pipeline, pgvector semantic similarity search, grounded Claude Q&A with citations.
10. **Phase 9 — Voice-of-Customer**: Pre-computed metrics, Claude executive narrative generation, report persistence, print/PDF export.
11. **Phase 10 — Production Hardening**: Multi-tenancy isolation audit, RBAC security verification, demo credentials, video walkthrough, and final submission.
