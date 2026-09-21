# LOOP — AI Customer-Feedback Intelligence Platform

> *"Close the loop on customer feedback."*

Project LOOP is a modern, enterprise-grade multi-tenant web application designed to help product managers, customer success leads, and executives transform unstructured customer feedback into prioritized product intelligence. 

LOOP ingests feedback across support tickets, app store reviews, NPS surveys, sales conversations, and community forums. Using advanced AI classification, semantic embeddings, vector retrieval, and deterministic statistical aggregations, LOOP surfaces recurring pain points, flags emerging trend spikes, provides grounded conversational search (Ask LOOP), and synthesizes executive Voice-of-Customer (VoC) reports.

---

## Documented AI Provider Deviation

> [!IMPORTANT]
> **Authoritative Specification Notice**:  
> The original Zidio specification specifies Anthropic Claude Sonnet 4.6. This implementation uses Google Gemini Flash Lite (`gemini-flash-lite-latest`) for generation and `gemini-embedding-001` (768 dimensions) for embeddings as a documented cost-saving implementation choice.  
> The AI provider layer is fully abstracted behind strict TypeScript interfaces (`AIClassificationProvider`, `EmbeddingProvider`, `RagAnswerProvider`, `VoCRecommendationsProvider`) to allow seamless replacement with Claude Sonnet or any other LLM provider without altering application business logic.

---

## Visual Design System & Stitch Integration

The LOOP user interface has been designed following the **Google Stitch** design direction, providing a clean, data-focused, professional SaaS analytics interface for everyday use by Product Managers.

### Key Visual Characteristics
- **Light Theme (Default)**: Crisp neutral backgrounds (`#f8fafc`), elevated white surfaces (`#ffffff`), subtle borders (`#e2e8f0`), deep slate typography (`#0f172a`), and restrained primary accents (`#2563eb`).
- **Dark Theme**: Refined charcoal/slate surfaces (`#020617`, `#0f172a`), low-contrast borders (`#1e293b`), and legible light typography (`#f8fafc`).
- **Accessible Theme Toggle**: A persistent sun/moon switch located in the global navigation bar (`localStorage` backed with anti-flash inline script).
- **Strictly No Gimmicks**: Strictly **no** neon cyberpunk styling, **no** excessive purple/black gradients, **no** glowing borders, and **no** dark-only lock-in.

---

## Core Features & Modules

### C1: Multi-Channel Feedback Ingestion
- Single feedback ingestion with channel tagging (`SUPPORT_TICKET`, `APP_STORE`, `NPS_SURVEY`, `SALES_CALL`, `COMMUNITY`).
- Bulk CSV import with client and server validation, parsing error diagnostics, and progress telemetry.
- Simulated channel generator for realistic synthetic traffic modeling across time windows.

### C2: AI-Powered Feedback Classification
- Automated sentiment analysis (`POS`, `NEU`, `NEG`) with continuous sentiment scoring (`-1.0` to `+1.0`).
- Feature area tagging (`Billing & Subscriptions`, `Authentication & SSO`, `Navigation`, `Mobile App`, `Integrations`, `Analytics`, `Performance`, `API`).
- AI-generated root-cause rationale explaining sentiment scores.
- Dynamic theme assignment reusing existing taxonomy.

### C3: Themes & Trends Intelligence
- Workspace-scoped theme aggregation with total volume and sentiment distributions.
- Daily inflow trend charts over 7-day, 30-day, and 60-day historical windows.
- Deterministic spike detector flagging sudden increases in issue frequency with percentage change calculations.
- Paginated feedback drill-down per theme.

### C4: Feedback Inbox & Status Triage
- High-density, responsive feedback data table with mobile card fallback.
- Multi-dimensional filtering: free-text search, channel, sentiment, theme, status, and custom date range bounds.
- Inline status triage (`NEW` → `REVIEWED` → `ACTIONED`) with server-side RBAC enforcement (`ADMIN` / `ANALYST` authorized, `VIEWER` read-only 403).
- Fast server-side pagination with custom page-size limits.

### C5: Analytics Dashboard
- Database-driven KPI metric cards:
  - **Total Feedback**: All-time and period-scoped volume with percentage change.
  - **% Negative**: Mathematically normalized against classified feedback.
  - **New This Week**: Trailing 7-day count of newly ingested signals.
  - **Active Themes**: Distinct theme taxonomy count.
- Interactive Recharts visualizations:
  - **Volume Over Time**: Dual-area chart comparing total vs negative inflow.
  - **Sentiment Distribution**: Donut breakdown with exact item counts.
  - **Top Themes by Volume**: Ranked horizontal bar chart.
- Responsive date range filtering (7 Days, 30 Days, 90 Days).

### AI3: Semantic Vector Search & Ask LOOP (RAG)
- 768-dimensional vector embeddings generated using `gemini-embedding-001`.
- PostgreSQL `pgvector` cosine similarity retrieval (`<=>`) strictly isolated by `workspaceId`.
- Grounded question-answering with anti-hallucination citation validation.
- Relevance perimeter defense: automatically detects low-relevance or unrelated queries (e.g. quantum teleportation) and returns controlled no-data state without calling LLMs.

### AI4: Executive Voice-of-Customer (VoC) Reports
- Automated synthesis of executive summaries, sentiment shift calculations, top themes matrix, authentic customer quotes, and prioritized action recommendations.
- Contiguous, non-overlapping comparison periods `[compStart, periodStart)` preventing double-counting boundary feedback.
- Zero-denominator protection on all statistical formulas.
- Export to JSON, browser-native print layout, and authenticated share URL generation.

---

## Role-Based Access Control (RBAC) Matrix

| Capability / Action | Route / API | ADMIN | ANALYST | VIEWER |
| :--- | :--- | :---: | :---: | :---: |
| Access Dashboard & Metrics | `/dashboard`, `/api/dashboard` | ✅ | ✅ | ✅ |
| Browse Feedback Inbox | `/feedback`, `/api/feedback` | ✅ | ✅ | ✅ |
| Ask LOOP Q&A Workspace | `/ask-loop`, `/api/ask-loop` | ✅ | ✅ | ✅ |
| View Themes & Trends | `/themes`, `/api/themes` | ✅ | ✅ | ✅ |
| View Saved VoC Reports | `/reports`, `/api/reports` | ✅ | ✅ | ✅ |
| View VoC Report Detail | `/reports/[id]`, `/api/reports/[id]` | ✅ | ✅ | ✅ |
| Ingest Feedback (Single/CSV/Sim) | `/feedback/ingest`, `/api/feedback/*` | ✅ | ✅ | ❌ (403) |
| Triage Status (`NEW` → `ACTIONED`)| `PATCH /api/feedback/[id]` | ✅ | ✅ | ❌ (403) |
| Trigger AI Classification | `POST /api/feedback/[id]/classify` | ✅ | ✅ | ❌ (403) |
| Generate New VoC Reports | `POST /api/reports` | ✅ | ✅ | ❌ (403) |
| View Team Members | `/settings/members`, `/api/members` | ✅ | ❌ (403) | ❌ (403) |
| Change Member Roles / Delete | `PATCH/DELETE /api/members/[id]` | ✅ | ❌ (403) | ❌ (403) |

---

## Demo Credentials (Pre-seeded)

Use these accounts to evaluate role-based access control and tenant isolation:

| Role | Email | Password | Permissions & Workspace Scope |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@loop.demo` | `DemoPass123!` | Full workspace administration, member role editing, triage & reports (Acme SaaS) |
| **ANALYST** | `analyst@loop.demo` | `DemoPass123!` | Feedback ingestion, manual AI classification, triage & reports (Acme SaaS) |
| **VIEWER** | `viewer@loop.demo` | `DemoPass123!` | Read-only analytics, inbox browsing, and Ask LOOP exploration (Acme SaaS) |

*Note: All passwords are encrypted with bcrypt (salt rounds = 12). No plain-text passwords or secret keys exist in the repository.*

---

## Technology Stack

- **Frontend & App Framework**: Next.js 14 (App Router), React 18, TypeScript (Strict Mode)
- **Styling**: Tailwind CSS, CSS Custom Properties (Theme Tokens), Lucide Icons
- **Data Visualization**: Recharts (Responsive Area, Donut, and Bar charts)
- **Database**: PostgreSQL with `pgvector` (0.8.2) extension on Supabase
- **ORM**: Prisma ORM (v5.22.0) with native PostgreSQL `vector(768)`
- **Authentication**: NextAuth.js (Auth.js v4) with JWT session strategy and bcryptjs
- **AI Intelligence**: Google Gemini Flash Lite (`gemini-flash-lite-latest`) via `@google/genai`
- **Embeddings**: Google `gemini-embedding-001` (768 dimensions)
- **Validation**: Zod (perimeter schema validation across all endpoints)

---

## Architecture & Multi-Tenant Security

### Strict Tenant Isolation
Every database query and mutation is strictly scoped to the authenticated caller's session `workspaceId`:
- Clients can **never** supply a `workspaceId` to bypass isolation.
- Accessing another workspace's feedback, theme, report, or member returns `404 Not Found` (non-disclosing perimeter behavior).
- Vector retrieval executes inside PostgreSQL using parameterized SQL:
  ```sql
  WHERE f."workspaceId" = $1
  ORDER BY (e.vector <=> $2::vector(768)) ASC
  ```
  Foreign workspace vectors are never loaded into application memory.

### Robust Mathematical Calculations
- **Non-Overlapping Comparison Bounds**:
  - Current Period: `[periodStart, periodEnd]`
  - Comparison Period: `[compStart, periodStart)` strictly `< periodStart`
- **Zero-Denominator Safety**: Every percentage and average score calculation guards against zero counts, safely returning `0.0%` or `null` rather than `NaN` or `Infinity`.

---

## Environment Variables

The application requires the following environment variables. Set them in your local `.env` or production deployment settings:

| Variable Name | Required | Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (must have `pgvector` installed) |
| `NEXTAUTH_SECRET` | **Yes** | 32+ character random secret used to sign session JWTs |
| `NEXTAUTH_URL` | **Yes** | Canonical URL of the application (e.g. `http://localhost:3000` or production domain) |
| `GEMINI_API_KEY` | **Optional** | Google Gemini API key (enables live classification, embeddings, and RAG). If omitted, falls back safely to deterministic mock providers in development. |
| `GEMINI_MODEL` | No | Overrides generative model (default: `gemini-flash-lite-latest`) |
| `GEMINI_EMBEDDING_MODEL` | No | Overrides embedding model (default: `gemini-embedding-001`) |

> [!WARNING]
> No variable containing API keys or database credentials should ever be prefixed with `NEXT_PUBLIC_`. All secret handling is strictly server-side.

---

## Local Setup & Development

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Sumit-217/LOOP.git
cd LOOP
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your connection strings:
```bash
cp .env.example .env
```

### 3. Initialize Database & Seed
```bash
# Validate Prisma schema
npx prisma validate

# Generate Prisma Client
npx prisma generate

# Apply migrations
npx prisma migrate status

# Seed demo workspaces, users, themes, and 120+ feedback records
npm run db:seed

# Backfill pgvector embeddings (optional if seeding from scratch)
npx tsx scripts/backfill-embeddings.ts
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Automated Verification & Regression Suite

LOOP includes a comprehensive automated test suite testing all functionality across all implementation phases:

```bash
# Run all 7 test suites in sequence
npm test
```

### Individual Verification Suites
```bash
# Phase 3: Feedback Ingestion & CSV Import
npx tsx scripts/verify-ingestion.ts

# Phase 4: AI Classification & Taxonomy
npx tsx scripts/verify-ai-classification.ts

# Phase 5: Themes & Trends Intelligence
npx tsx scripts/verify-themes-trends.ts

# Phase 6: pgvector Extension & Migration
npx tsx scripts/verify-pgvector-migration.ts

# Phase 6: Ask LOOP RAG & Embeddings
npx tsx scripts/verify-ask-loop.ts

# Phase 7: VoC Reports & Synthesis
npx tsx scripts/verify-voc-reports.ts

# Phase 8: Final Hardening, RBAC, C4/C5, & Tenant Isolation
npx tsx scripts/verify-final-hardening.ts
```

### Production Build Validation
```bash
npm run build
```

---

## Production Deployment (Vercel)

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Configure the following environment variables in Vercel Project Settings:
   - `DATABASE_URL`: Supabase Transaction/Session pooler URL with `?sslmode=require`
   - `NEXTAUTH_SECRET`: Random 32-byte secret (e.g. generated via `openssl rand -base64 32`)
   - `NEXTAUTH_URL`: Canonical production deployment domain (`https://your-app.vercel.app`)
   - `GEMINI_API_KEY`: Server-side Google Gemini API key
4. Deploy. Next.js App Router will compile all static and dynamic endpoints automatically.

---

## Manual Submission & Screenshot Checklist

When preparing final submission collateral or slide decks, capture screenshots of the following live views:

1. **Login Screen (`/login`)**: Light & Dark theme showing demo credentials.
2. **Analytics Dashboard (`/dashboard`)**: KPI stat cards, volume over time area chart, sentiment donut, top themes bar chart.
3. **Feedback Inbox (`/feedback`)**: Filter bar, status badges, and inline triage transition (`NEW` → `REVIEWED`).
4. **Ingestion Hub (`/feedback/ingest`)**: CSV bulk uploader and synthetic channel generator.
5. **Themes & Trends (`/themes`)**: Theme volume ranking, sentiment distribution, and spike telemetry.
6. **Ask LOOP (`/ask-loop`)**: Grounded question response with verifiable citation evidence cards.
7. **VoC Reports List (`/reports`)**: Saved reports listing with period dates and executive summary snippets.
8. **VoC Report Detail (`/reports/[id]`)**: Executive summary, sentiment shifts, quote evidence cards, and action recommendations.
9. **Members Management (`/settings/members`)**: Team directory and RBAC role assignments.

---

## Known Limitations & Future Enhancements

- **Direct Third-Party OAuth Sync**: Ingestion currently supports CSV import, manual entry, and synthetic stream generation; direct OAuth connections to Zendesk, Jira, or Intercom APIs can be added as webhook listeners.
- **Background Worker Queues**: Ingestion and classification run synchronously within Next.js API timeouts. High-scale enterprise deployments (10,000+ rows/second) would benefit from an asynchronous job queue (e.g. BullMQ / Inngest).
- **Public Report Sharing**: Report links currently enforce workspace authentication. Public token-based read-only links can be introduced if unauthenticated client presentations are desired.

---

## License

This project is developed as part of the Zidio Development Internship program.
