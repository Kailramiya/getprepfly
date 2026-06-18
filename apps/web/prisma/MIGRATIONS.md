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

`prisma migrate deploy` runs automatically as part of the build
(see `package.json` "build" and `vercel.json` "buildCommand").

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
