# LOOP — AI Customer-Feedback Intelligence Platform

> *"Close the loop on customer feedback."*

Project LOOP is a corporate-grade multi-tenant web application designed to help modern SaaS companies make sense of customer feedback arriving across support tickets, app-store reviews, NPS surveys, sales notes, and community posts. It automates classification, theme clustering, trend and spike detection, grounded natural-language Q&A (Ask LOOP), and executive Voice-of-Customer (VoC) report generation.

---

## Current Phase

**Phase 0 — Project Foundation**

The project foundation is configured with Next.js 14, TypeScript, Tailwind CSS, App Router, and core architectural dependencies.

---

## Current Status

> [!NOTE]
> **Business functionality is not implemented yet.**
> In accordance with the Phase 0 specification, database models, migrations, authentication, feedback ingestion, analytics dashboards, and AI services will be implemented in subsequent phases.

---

## Tech Stack

Derived strictly from `Zidio_Project_Web_1.1.pdf`:

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict typing)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Neon / Supabase)
- **ORM**: Prisma ORM
- **Authentication**: NextAuth.js (Auth.js)
- **AI Intelligence**: Anthropic Claude API (`claude-sonnet-4-6` / Sonnet)
- **Embeddings & Search**: Vector embeddings (pgvector / hosted provider)
- **Visualizations**: Recharts
- **Validation**: Zod
- **Deployment**: Vercel + Hosted PostgreSQL

---

## Project Structure

```text
loop/
├── app/
│   ├── api/
│   │   └── health/
│   │       └── route.ts        # Smoke-check health endpoint
│   ├── layout.tsx              # Root application layout
│   ├── page.tsx                # Phase 0 foundation status landing page
│   └── globals.css             # Tailwind CSS directives
├── components/                 # Reusable UI components
├── lib/
│   ├── utils.ts                # Tailwind merge and styling utilities
│   └── ...                     # Core utilities (db, auth, ai, search in later phases)
├── public/                     # Static assets
├── types/
│   └── index.ts                # TypeScript definitions
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

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher (recommended: Node 20+ LTS; verified on Node 22)
- **Package Manager**: `npm`

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/Sumit-217/LOOP.git
cd LOOP
npm install
```

### 3. Environment Variables
Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure your local secrets in `.env.local`. **Never commit `.env` or `.env.local` to version control.**

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (Neon / Supabase) |
| `NEXTAUTH_SECRET` | 32-char secret for NextAuth JWT encryption |
| `NEXTAUTH_URL` | Application root URL (`http://localhost:3000` locally) |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `ANTHROPIC_MODEL` | Claude model identifier (`claude-3-5-sonnet-20241022`) |
| `OPENAI_API_KEY` | Embeddings provider API key |

### 4. Running Locally
Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To verify API health:
[http://localhost:3000/api/health](http://localhost:3000/api/health)

### 5. Production Build
Verify the production build:

```bash
npm run build
npm run start
```

---

## Upcoming Phases

1. **Phase 1 — Database & Multi-Tenancy**: Prisma schema, migrations, Workspace, User, Feedback, Theme, Embedding, and Report models.
2. **Phase 2 — Authentication & RBAC**: NextAuth setup, credentials auth, session management, ADMIN/ANALYST/VIEWER role guards, 403 handling.
3. **Phase 3 — Feedback Ingestion**: Single entry form, CSV bulk parser with summary, simulated channel generator, and seed data.
4. **Phase 4 — Feedback Inbox**: Server-side pagination, multi-filter query builder, full-text search, inline status triage.
5. **Phase 5 — Analytics Dashboard**: Recharts data visualizations (volume, sentiment, themes), key stat cards, responsive layouts.
6. **Phase 6 — AI Classification**: Claude API integration, structured Zod parsing, sentiment scoring, feature area tagging, re-classify action.
7. **Phase 7 — Themes & Trends**: Feedback theme clustering, spike detection algorithm, theme drill-down navigation.
8. **Phase 8 — Ask LOOP**: Vector embedding pipeline, pgvector semantic similarity search, grounded Claude Q&A with citations.
9. **Phase 9 — Voice-of-Customer**: Pre-computed metrics, Claude executive narrative generation, report persistence, print/PDF export.
10. **Phase 10 — Production Hardening**: Multi-tenancy isolation audit, RBAC security verification, demo credentials, video walkthrough, and final submission.
