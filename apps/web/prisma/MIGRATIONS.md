# Database migrations

This project now uses **versioned Prisma migrations** (`prisma migrate`) instead
of `prisma db push`. Every schema change must ship as a migration in
`prisma/migrations/` so production changes are reviewable and reversible.

## Migration history

| Migration | Purpose |
|-----------|---------|
| `0_init` | Baseline — the full schema as it existed when migrations were introduced. |
| `20260101000000_add_payment_coupon_code` | Adds `Payment.couponCode` (coupon redemption tracking). |

## Day-to-day workflow

After editing `schema.prisma`:

```bash
npm run db:migrate          # = prisma migrate dev — creates + applies a new migration locally
```

Never use `prisma db push` against a real database anymore — it bypasses
migration history. (`db:push` is kept only for throwaway local experiments.)

## Deploying

Migrations are **NOT** run during the build. The build only does
`prisma generate && next build`. You run `migrate deploy` deliberately, as a
separate step, against the **direct** connection:

```bash
cd apps/web
# DIRECT_URL + DATABASE_URL must point at the target DB
npx prisma migrate deploy
```

Why not in the build? Vercel builds can run concurrently or retry, and each
`migrate deploy` tries to take a single Postgres advisory lock. When two grab
for it at once (or a previous run's connection is still holding it), you get
`P1002 — Timed out trying to acquire a postgres advisory lock`. Running
migrations as one deliberate step avoids that entirely. If the lock ever gets
stuck, restart the Neon compute (Neon console → your branch → Restart) to drop
all sessions and release it, then re-run `migrate deploy`.

**Two database URLs are required** (see `schema.prisma` datasource):
- `DATABASE_URL` — pooled connection, used by the app at runtime. On Neon, the
  host contains `-pooler`.
- `DIRECT_URL` — direct, non-pooled connection, used by `prisma migrate`. On Neon,
  it's the same string **without** `-pooler`.

Migrations MUST use the direct connection. Running `migrate deploy` over the
pooled (PgBouncer) connection fails with `P1002` — "Timed out trying to acquire
a postgres advisory lock" — because PgBouncer doesn't hold the session lock.
Set BOTH env vars in Vercel (and locally in `apps/web/.env`).

## ⚠️ One-time baseline for the EXISTING database

The production/staging database was originally created with `prisma db push`,
so its tables already exist and predate the `couponCode` column. Do **not** run
a fresh `migrate deploy` against it blindly — it would try to re-create existing
tables. Baseline it once instead:

```bash
# 1. Mark the baseline as already-applied (tables already exist):
npx prisma migrate resolve --applied 0_init

# 2. Apply only the genuinely-new migrations (adds Payment.couponCode):
npx prisma migrate deploy
```

For a brand-new/empty database, skip the resolve step — `prisma migrate deploy`
applies everything from scratch.
