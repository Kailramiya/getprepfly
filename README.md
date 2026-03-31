# PTE Master — AI-Powered PTE Practice Platform

> APEUni competitor built for Indian coaching centres. Multi-tenant, AI-scored, Hindi/Punjabi support.

## Quick Start (Local Setup)

### Prerequisites
- **Node.js** 18+ ([download](https://nodejs.org))
- **PostgreSQL** 15+ ([download](https://www.postgresql.org/download/))
- **Git**

### Step 1: Clone & Install

```bash
git clone <your-repo-url> pte-platform
cd pte-platform
npm install
```

### Step 2: Setup Database

Create a PostgreSQL database:
```bash
# Open psql terminal
psql -U postgres

# Create database
CREATE DATABASE pte_platform;
\q
```

### Step 3: Configure Environment

```bash
# Copy example env
cp .env.example .env
cp .env.example apps/web/.env

# Edit .env — update DATABASE_URL with your postgres credentials:
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/pte_platform"
```

### Step 4: Setup Prisma & Seed Data

```bash
cd apps/web

# Generate Prisma client
npx prisma generate

# Push schema to database (creates all tables)
npx prisma db push

# Seed sample data (questions, users, centre)
npx tsx prisma/seed.ts
```

### Step 5: Run

```bash
# From apps/web directory
npm run dev
```

Open **http://localhost:3000** in your browser.

### Test Accounts (from seed)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@ptemaster.in | admin123 |
| Centre Admin | admin@divinesuccess.com | centre123 |
| Student | student@test.com | student123 |

- **Centre code:** `divine-success`
- **Coupon code:** `LAUNCH50` (50% off)

---

## Project Structure

```
pte-platform/
├── apps/
│   ├── web/                    # Next.js 14 web app
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema (20+ models)
│   │   │   └── seed.ts         # Sample data seeder
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/     # Login, Register pages
│   │       │   ├── (dashboard)/ # All dashboard pages
│   │       │   └── api/        # 19 API routes
│   │       ├── components/     # UI + Practice + Layout components
│   │       ├── hooks/          # Audio recorder, Auth, Upload hooks
│   │       └── lib/            # DB, Auth, i18n, utils
│   └── mobile/                 # React Native / Expo app
│       └── src/
│           ├── screens/        # Login, Dashboard, Practice screens
│           ├── stores/         # Zustand auth store
│           └── lib/            # API client
├── packages/
│   ├── database/               # Prisma client export
│   └── shared/                 # Types, constants, utils
├── .env.example                # Environment template
└── package.json                # Monorepo root
```

## API Keys (Optional for MVP)

The app works without these — they enable premium features:

| Key | Required For | Get It From |
|-----|-------------|-------------|
| OPENAI_API_KEY | AI scoring (Speaking/Writing) | platform.openai.com |
| GOOGLE_CLIENT_ID/SECRET | Google login | console.cloud.google.com |
| RAZORPAY_KEY_ID/SECRET | Payments | dashboard.razorpay.com |
| AWS S3 keys | File uploads | aws.amazon.com |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Radix UI |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL |
| AI | OpenAI Whisper (speech) + GPT-4o-mini (scoring) |
| Payments | Razorpay |
| Mobile | React Native / Expo |
| Auth | NextAuth.js (JWT) |
