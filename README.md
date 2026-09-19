# LOOP — AI Customer-Feedback Intelligence Platform

> *"Close the loop on customer feedback."*

Project LOOP is a corporate-grade multi-tenant web application designed to help modern SaaS companies make sense of customer feedback arriving across support tickets, app-store reviews, NPS surveys, sales notes, and community posts. It automates classification, theme clustering, trend and spike detection, grounded natural-language Q&A (Ask LOOP), and executive Voice-of-Customer (VoC) report generation.

---

## Current Phase

**Phase 5 — Themes & Trends Intelligence**

Workspace-scoped theme clustering, volume aggregation, sentiment distribution, multi-period trend analysis with daily buckets (7d, 30d, 60d), deterministic change and spike detection, server-side paginated drill-down, and interactive Recharts visualizations.

---

## AI Provider & Implementation Note

**AI Provider**: Google Gemini  
**Model**: Gemini 2.5 Flash (`gemini-2.5-flash`)

> [!NOTE]
> **Implementation note**:  
> The original project specification references Claude Sonnet 4.6.  
> This implementation uses **Gemini 2.5 Flash** through a provider abstraction (`AIClassificationProvider`) to reduce development and API cost while preserving the ability to swap providers later.  
> The `GEMINI_API_KEY` is strictly server-side and never exposed to client components. Phase 5 analytics rely purely on persisted database records and require zero live Gemini API calls.

---

## Current Status

* **Phase 0 — Project Foundation**: ✅ Next.js 14, TypeScript, Tailwind CSS, Vercel readiness.
* **Phase 1 — Database & Multi-Tenancy**: ✅ Live Supabase PostgreSQL connection, 7 core Prisma models, relational integrity.
* **Phase 2 — Authentication & RBAC**: ✅ NextAuth.js credentials, persistent JWT sessions, bcrypt hashing, `ADMIN` / `ANALYST` / `VIEWER` roles.
* **Phase 3 — Feedback Ingestion**: ✅ Single submissions, CSV bulk import with error diagnostics, simulated external channels, 130+ seeded records.
* **Phase 4 — AI Classification**: ✅ Single feedback classification, manual re-classification, provider abstraction (`AIClassificationProvider`), existing theme reuse, strict Zod validation, transactional persistence.
* **Phase 5 — Themes & Trends Intelligence**: ✅ Workspace-scoped theme aggregation, volume metrics, sentiment breakdown, daily trend time series (7d, 30d, 60d), deterministic spike detection, server-side paginated drill-down, Recharts visualization.

---

## Tech Stack

Derived from `Zidio_Project_Web_1.1.pdf` with intentional Gemini provider abstraction:

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict typing)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Neon / Supabase)
- **ORM**: Prisma ORM (v5.22.0 LTS)
- **Authentication**: NextAuth.js (Auth.js v4) + bcryptjs
- **AI Intelligence**: Google Gemini 2.5 Flash via `@google/genai` (with `AIClassificationProvider` abstraction)
- **Embeddings & Search**: Vector embeddings (pgvector / hosted provider) *(Phase 8)*
- **Visualizations**: Recharts *(Phase 5)*
- **Validation**: Zod (runtime perimeter defense)
- **Deployment**: Vercel + Hosted PostgreSQL

---

## Role-Based Access Control (RBAC) & Permissions Matrix

| Capability / Resource | ADMIN | ANALYST | VIEWER |
| :--- | :---: | :---: | :---: |
| Access Authenticated App (`/dashboard`) | ✅ | ✅ | ✅ |
| View Workspace Intelligence & Feedback | ✅ | ✅ | ✅ |
| View Themes & Trends Intelligence (`/themes`) | ✅ | ✅ | ✅ |
| View Team Members (`/settings/members`) | ✅ | ❌ | ❌ |
| Modify Teammate Roles (Admin/Analyst/Viewer) | ✅ | ❌ | ❌ |
| Create / Ingest Feedback (`/feedback/ingest`) | ✅ | ✅ | ❌ (403) |
| Classify / Re-classify Feedback with AI | ✅ | ✅ | ❌ (403) |
| Generate Voice-of-Customer Reports *(Phase 9)*| ✅ | ✅ | ❌ (403) |

> **Security Rule**: RBAC is strictly enforced server-side via API authorization guards (`requireRole`). Client-side UI element hiding is purely cosmetic; forbidden requests return HTTP `403 Forbidden`. Read-only analytics endpoints allow `ADMIN`, `ANALYST`, and `VIEWER`.

---

## Phase 5 — Themes & Trends Intelligence Architecture

### 1. Theme Aggregation & Volume Metrics
- **Strict Workspace Boundary**: Every query filters themes and feedback by `session.user.workspaceId`.
- **Existing Taxonomy Only**: Phase 5 reuses existing workspace `Theme` records; it never creates new themes dynamically.
- **Unclassified vs. Neutral Boundary**:
  - A feedback record is **unclassified** if `featureArea === null`, `rationale === null`, `sentiment === "NEU"`, and `sentimentScore === 0.0`.
  - Unclassified records are isolated into `unclassifiedCount` and are **never** counted as neutral, ensuring metrics are unpolluted.
  - `negativePercentage` is computed strictly against classified records: `(negativeCount / classifiedCount) * 100`.
  - `averageSentimentScore` strictly averages classified feedback scores between `-1.0` and `+1.0`.

### 2. Trends & Daily Time Windows
- Supports user-selectable windows: **Last 7 Days (`7d`)**, **Last 30 Days (`30d`)**, and **Last 60 Days (`60d`)**.
- Aggregates feedback into daily continuous date buckets (`YYYY-MM-DD`).
- Powers interactive Recharts area/line visualizations allowing multi-theme overlays and single-theme sentiment breakdown.

### 3. Explainable Deterministic Spike / Change Detection
Compares the current window ($N$ days) with the preceding period of equal length:
- **Absolute Change**: $\Delta = C_{\text{curr}} - C_{\text{prev}}$
- **Percentage Change**: $\frac{C_{\text{curr}} - C_{\text{prev}}}{C_{\text{prev}}} \times 100$
- **Zero-Count & Edge Handling**:
  - `prev = 0, curr = 0`: Flat (0%), description: *"No feedback recorded in the current or previous period."*
  - `prev = 0, curr > 0`: 100%, description: *"Feedback volume reached X (new activity compared with zero in previous period)."*
  - `Spike Flag`: Triggered neutrally when $\Delta \ge 3$ and percentage change $\ge 50\%$, or current $\ge 3$ from zero.

### 4. Theme Drill-Down & Server-Side Pagination
- Clicking any theme opens a drill-down modal displaying underlying feedback records with customer label, channel badges, sentiment score, AI feature area, and AI rationale.
- Supports server-side pagination (`page`, `limit`) and dynamic filtering by channel and sentiment.
- Foreign theme access attempts return `404 Not Found` to prevent cross-tenant enumeration.

---

## Demo Credentials (Local / Staging Only)

The seeded demo workspace comes pre-configured with three role accounts for testing and evaluation:

| Role | Email | Password | Scope / Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@loop.demo` | `DemoPass123!` | Full workspace administration, members management & AI classification |
| **ANALYST** | `analyst@loop.demo` | `DemoPass123!` | Feedback ingestion, manual AI classification, and triage |
| **VIEWER** | `viewer@loop.demo` | `DemoPass123!` | Read-only access to feedback intelligence and dashboards |

*(Passwords are stored strictly as salted bcrypt one-way hashes; passwordHash is never returned to clients or embedded in session tokens).*

---

## Local Setup

### 1. Installation
```bash
git clone https://github.com/Sumit-217/LOOP.git
cd LOOP
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your credentials:

```env
DATABASE_URL="postgresql://user:password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
NEXTAUTH_SECRET="a-secure-random-32-character-secret"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
```

### 3. Database Migration & Seed
```bash
# Apply migrations
npm run db:migrate

# Seed baseline demo workspace & 130+ feedback records
npm run db:seed
```

### 4. Running Verification Tests
```bash
# Verify Phase 3 feedback ingestion
npx tsx scripts/verify-ingestion.ts

# Verify Phase 4 AI classification engine
npx tsx scripts/verify-ai-classification.ts

# Verify Phase 5 Themes & Trends intelligence
npx tsx scripts/verify-themes-trends.ts
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
