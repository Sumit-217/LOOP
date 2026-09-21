# LOOP — AI Customer-Feedback Intelligence Platform

> *"Close the loop on customer feedback."*

Project LOOP is a corporate-grade multi-tenant web application designed to help modern SaaS companies make sense of customer feedback arriving across support tickets, app-store reviews, NPS surveys, sales notes, and community posts. It automates classification, theme clustering, trend and spike detection, grounded natural-language Q&A (Ask LOOP), and executive Voice-of-Customer (VoC) report generation.

---

## Current Phase

**Phase 6 — Embeddings + Semantic Search + Ask LOOP RAG**

Full-stack semantic search and grounded Question-Answering (Ask LOOP) over workspace customer feedback using PostgreSQL pgvector cosine similarity search and Google Gemini 2.5 Flash / `gemini-embedding-001`.

---

## AI Provider & Implementation Note

- **AI Classification**: Google Gemini 2.5 Flash (`gemini-2.5-flash`)
- **Embeddings**: `gemini-embedding-001`
  - **Dimensions**: 768
  - **Document Task**: `RETRIEVAL_DOCUMENT`
  - **Query Task**: `RETRIEVAL_QUERY`
- **Vector Store**: Supabase PostgreSQL + pgvector (0.8.2) with `vector(768)`
- **RAG Answer Generation**: Google Gemini 2.5 Flash (`gemini-2.5-flash`)

> [!IMPORTANT]
> **Specification Deviation Note**:  
> The original Zidio specification names Claude Sonnet 4.6. This implementation intentionally uses Google Gemini (Gemini 2.5 Flash and `gemini-embedding-001`) to reduce development and API costs while retaining clean provider abstractions (`EmbeddingProvider`, `AIClassificationProvider`, `RagAnswerProvider`) that support swapping to Claude or any other provider later.  
> The `GEMINI_API_KEY` is strictly server-side and never exposed to the client.

---

## Current Status

* **Phase 0 — Project Foundation**: ✅ Next.js 14, TypeScript, Tailwind CSS, Vercel readiness.
* **Phase 1 — Database & Multi-Tenancy**: ✅ Live Supabase PostgreSQL connection, 7 core Prisma models, relational integrity.
* **Phase 2 — Authentication & RBAC**: ✅ NextAuth.js credentials, persistent JWT sessions, bcrypt hashing, `ADMIN` / `ANALYST` / `VIEWER` roles.
* **Phase 3 — Feedback Ingestion**: ✅ Single submissions, CSV bulk import with error diagnostics, simulated external channels, 130+ seeded records.
* **Phase 4 — AI Classification**: ✅ Single feedback classification, manual re-classification, provider abstraction (`AIClassificationProvider`), existing theme reuse, strict Zod validation, transactional persistence.
* **Phase 5 — Themes & Trends Intelligence**: ✅ Workspace-scoped theme aggregation, volume metrics, sentiment breakdown, daily trend time series (7d, 30d, 60d), deterministic spike detection, server-side paginated drill-down, Recharts visualization.
* **Phase 6 — Embeddings + Semantic Search + Ask LOOP**: ✅ 768-dim pgvector migration, deterministic mock provider, document and query embedding generation, idempotent workspace backfill, non-blocking ingestion hooks, parameterized SQL cosine search (`<=>`), bounded RAG context, anti-hallucination citation verification, Ask LOOP API and responsive interactive UI.

---

## Phase 6 Architecture & Technical Details

### 1. Vector Embeddings (`gemini-embedding-001`)
- **Provider Abstraction**: Decoupled via `EmbeddingProvider` interface in `lib/embeddings/types.ts`:
  - `embedDocument(text: string): Promise<number[]>` (`RETRIEVAL_DOCUMENT`, 768 dimensions)
  - `embedQuery(text: string): Promise<number[]>` (`RETRIEVAL_QUERY`, 768 dimensions)
- **Runtime Validation**: `lib/embeddings/validation.ts` strictly validates that every vector contains exactly 768 finite numbers. Rejects non-arrays, wrong lengths, `NaN`, and `Infinity` without silent truncation or padding.
- **Deterministic Mock Provider**: `lib/embeddings/providers/mock.ts` provides 100% deterministic 768-dim unit vectors for automated tests and offline development without network calls or `Math.random()`.

### 2. pgvector Persistence & Idempotent Backfill
- **Database Schema**: `embeddings.vector` column is PostgreSQL `vector(768)` managed with Prisma `Unsupported("vector(768)")`.
- **Parameterized SQL**: All vector insertions and queries use Prisma tagged template parameters (`$executeRaw` / `$queryRaw`), strictly avoiding string interpolation:
  ```sql
  INSERT INTO "embeddings" ("id", "feedbackId", "vector", "createdAt")
  VALUES ($1, $2, $3::vector(768), NOW())
  ON CONFLICT ("feedbackId")
  DO UPDATE SET "vector" = $3::vector(768), "createdAt" = NOW()
  ```
- **Controlled Backfill Service**: `backfillWorkspaceEmbeddings` in `lib/embeddings/service.ts`:
  - Scoped strictly to target `workspaceId`.
  - Idempotent and safe to rerun: finds feedback with `embedding: null`, skipping already indexed records.
  - Successfully backfilled 246 feedback records in Acme SaaS demo workspace with zero duplicates.

### 3. New Feedback Ingestion Integration
- Integrated across manual feedback (`/api/feedback`), CSV bulk import (`/api/feedback/bulk`), and simulated channels (`/api/feedback/simulate`).
- **Non-blocking Guarantee**: Feedback persistence is never rolled back or aborted if embedding generation fails. Any failures are logged and can be repaired at any time via backfill.

### 4. Workspace-Isolated Semantic Retrieval (`lib/rag/retrieval.ts`)
- **Cosine Distance**: Retrieves the closest semantic matches using the PostgreSQL pgvector `<=>` operator:
  ```sql
  SELECT f.id, f.content, f.channel, f."sourceRef", f."customerLabel", f.sentiment,
         f."sentimentScore", f.status, f."featureArea", f."createdAt",
         (e.vector <=> $1::vector(768)) AS "cosineDistance"
  FROM "embeddings" e
  JOIN "feedback" f ON f.id = e."feedbackId"
  WHERE f."workspaceId" = $2
  ORDER BY (e.vector <=> $1::vector(768)) ASC
  LIMIT $3;
  ```
- **Strict Multi-Tenancy**: The tenant filter (`WHERE f."workspaceId" = $2`) occurs directly inside the SQL query. Cross-tenant leakage is physically impossible.
- **Bounded Top-K**: Bounded between 3 and 8 (default: 6) to prevent unbounded memory or token usage.

### 5. Grounding, Relevance & Anti-Hallucination Perimeter
- **Relevance Threshold**: If retrieval returns 0 items or the best cosine distance exceeds `RELEVANCE_DISTANCE_THRESHOLD` (0.85), Ask LOOP returns a controlled response:
  > *"I couldn't find enough relevant feedback in your workspace to answer that confidently. Try asking about a specific product area, theme, channel, or time period."*
- **Bounded XML Context**: Sanitizes customer text and encloses untrusted feedback inside `<evidence_item>` tags within `<evidence_context>`. Instructions inside feedback cannot hijack system prompts.
- **Citation Verification**: Every citation returned by the LLM is verified against the set of retrieved feedback IDs. Hallucinated citation IDs are discarded before reaching the client.

### 6. Interactive Ask LOOP UI
- Accessible to all authenticated roles (`ADMIN`, `ANALYST`, `VIEWER`) via the top navigation bar at `/ask-loop`.
- Includes suggested questions, loading pulse state, grounded answer rendering, citation cards with direct quotes and channel badges, and empty/no-data/error states.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict typing)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Supabase) + pgvector (0.8.2)
- **ORM**: Prisma ORM (v5.22.0 LTS)
- **Authentication**: NextAuth.js (Auth.js v4) + bcryptjs
- **AI Intelligence**: Google Gemini 2.5 Flash via `@google/genai`
- **Embeddings**: `gemini-embedding-001` (768 dimensions) via pgvector
- **Visualizations**: Recharts
- **Validation**: Zod (runtime perimeter defense)

---

## Role-Based Access Control (RBAC) & Permissions Matrix

| Capability / Resource | ADMIN | ANALYST | VIEWER |
| :--- | :---: | :---: | :---: |
| Access Authenticated App (`/dashboard`) | ✅ | ✅ | ✅ |
| View Workspace Intelligence & Feedback | ✅ | ✅ | ✅ |
| View Themes & Trends Intelligence (`/themes`) | ✅ | ✅ | ✅ |
| Ask LOOP Semantic Search & Q&A (`/ask-loop`) | ✅ | ✅ | ✅ |
| View Team Members (`/settings/members`) | ✅ | ❌ | ❌ |
| Modify Teammate Roles (Admin/Analyst/Viewer) | ✅ | ❌ | ❌ |
| Create / Ingest Feedback (`/feedback/ingest`) | ✅ | ✅ | ❌ (403) |
| Classify / Re-classify Feedback with AI | ✅ | ✅ | ❌ (403) |
| Generate Voice-of-Customer Reports *(Phase 7)*| ✅ | ✅ | ❌ (403) |

---

## Demo Credentials (Local / Staging Only)

| Role | Email | Password | Scope / Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@loop.demo` | `DemoPass123!` | Full workspace administration, members management & AI classification |
| **ANALYST** | `analyst@loop.demo` | `DemoPass123!` | Feedback ingestion, manual AI classification, and triage |
| **VIEWER** | `viewer@loop.demo` | `DemoPass123!` | Read-only access to feedback intelligence and Ask LOOP |

---

## Local Setup & Testing

### 1. Installation & Environment
```bash
git clone https://github.com/Sumit-217/LOOP.git
cd LOOP
npm install
```

Configure `.env`:
```env
DATABASE_URL="postgresql://user:password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
NEXTAUTH_SECRET="a-secure-random-32-character-secret"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
GEMINI_EMBEDDING_MODEL="gemini-embedding-001"
```

### 2. Automated Test Suite (All Phases)
Run the full test suite covering all phases (Phase 3 through Phase 6):
```bash
npm test
```

Or run individual verification suites:
```bash
# Phase 3 Ingestion Suite
npx tsx scripts/verify-ingestion.ts

# Phase 4 AI Classification Suite
npx tsx scripts/verify-ai-classification.ts

# Phase 5 Themes & Trends Suite
npx tsx scripts/verify-themes-trends.ts

# Phase 6 pgvector Migration Verification
npx tsx scripts/verify-pgvector-migration.ts

# Phase 6 Embeddings & Ask LOOP Suite (27 tests)
npx tsx scripts/verify-ask-loop.ts

# Phase 6 Feedback Embeddings Backfill Script
npx tsx scripts/backfill-embeddings.ts
```

### 3. Production Build
```bash
npm run build
```
