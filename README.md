# LOOP — AI Customer-Feedback Intelligence Platform

> *"Close the loop on customer feedback."*

Project LOOP is a corporate-grade multi-tenant web application designed to help modern SaaS companies make sense of customer feedback arriving across support tickets, app-store reviews, NPS surveys, sales notes, and community posts. It automates classification, theme clustering, trend and spike detection, grounded natural-language Q&A (Ask LOOP), and executive Voice-of-Customer (VoC) report generation.

---

## Current Phase

**Phase 4 — AI Classification (Gemini 2.5 Flash Provider Abstraction)**

Customer feedback items can be analyzed and structured with automated sentiment classification (`POS`, `NEU`, `NEG`), continuous sentiment scores (`-1.0` to `+1.0`), existing workspace theme linkage via `FeedbackTheme`, functional feature-area tagging, and concise rationales.

---

## AI Provider & Implementation Note

**AI Provider**: Google Gemini  
**Model**: Gemini 2.5 Flash (`gemini-2.5-flash`)

> [!NOTE]
> **Implementation note**:  
> The original project specification references Claude Sonnet 4.6.  
> This implementation uses **Gemini 2.5 Flash** through a provider abstraction (`AIClassificationProvider`) to reduce development and API cost while preserving the ability to swap providers later.  
> The `GEMINI_API_KEY` is strictly server-side and never exposed to client components.

---

## Current Status

* **Phase 0 — Project Foundation**: ✅ Next.js 14, TypeScript, Tailwind CSS, Vercel readiness.
* **Phase 1 — Database & Multi-Tenancy**: ✅ Live Supabase PostgreSQL connection, 7 core Prisma models, relational integrity.
* **Phase 2 — Authentication & RBAC**: ✅ NextAuth.js credentials, persistent JWT sessions, bcrypt hashing, `ADMIN` / `ANALYST` / `VIEWER` roles.
* **Phase 3 — Feedback Ingestion**: ✅ Single submissions, CSV bulk import with error diagnostics, simulated external channels, 130+ seeded records.
* **Phase 4 — AI Classification**: ✅ Single feedback classification, manual re-classification, provider abstraction (`AIClassificationProvider`), existing theme reuse, strict Zod validation, transactional persistence.

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
| View Team Members (`/settings/members`) | ✅ | ❌ | ❌ |
| Modify Teammate Roles (Admin/Analyst/Viewer) | ✅ | ❌ | ❌ |
| Create / Ingest Feedback (`/feedback/ingest`) | ✅ | ✅ | ❌ (403) |
| Classify / Re-classify Feedback with AI | ✅ | ✅ | ❌ (403) |
| Generate Voice-of-Customer Reports *(Phase 9)*| ✅ | ✅ | ❌ (403) |

> **Security Rule**: RBAC is strictly enforced server-side via API authorization guards (`requireRole`). Client-side UI element hiding is purely cosmetic; forbidden requests return HTTP `403 Forbidden`.

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
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
