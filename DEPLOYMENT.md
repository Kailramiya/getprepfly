# PTE Master — Deployment Guide

## Option 1: Vercel (Recommended — Free, Easiest for Next.js)

Vercel is made by the creators of Next.js. Free tier includes:
- Unlimited deployments
- HTTPS/SSL included
- Custom domain support
- Automatic builds on git push
- Serverless API routes (our backend)

### Steps:

1. **Go to:** https://vercel.com
2. **Sign up** with your GitHub account (Kailramiya)
3. Click **"Add New Project"**
4. **Import** the `Kailramiya/DSIC` repository
5. **Configure:**
   - Framework: **Next.js** (auto-detected)
   - Root Directory: **apps/web**
   - Build Command: `prisma generate && next build`
   - Output Directory: `.next`
6. **Add Environment Variables** (click "Environment Variables" section):
   ```
   DATABASE_URL = (your PostgreSQL connection string — see Database section below)
   NEXTAUTH_SECRET = generate-a-random-secret-here
   NEXTAUTH_URL = https://your-app-name.vercel.app
   OPENAI_API_KEY = (your key — optional for now)
   ```
7. Click **"Deploy"**
8. Wait 2-3 minutes — your app is live at `https://your-app-name.vercel.app`

### Custom Domain on Vercel:
1. Go to Project Settings > Domains
2. Add `ptemaster.in` (or your domain)
3. Update DNS records as shown by Vercel

---

## Option 2: Cloudflare Tunnel (Share your local PC temporarily)

If you want to quickly share your LOCAL running app with the client without deploying:

### Steps:

1. **Install Cloudflare Tunnel (cloudflared):**
   ```bash
   # Ubuntu/Debian
   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
   sudo dpkg -i cloudflared.deb

   # Or on Mac
   brew install cloudflared
   ```

2. **Start your app locally:**
   ```bash
   cd ~/Desktop/QuickIntell/DSIC
   npm run dev
   # Note the port (e.g., 3000 or 3002)
   ```

3. **Create tunnel in another terminal:**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   (Replace 3000 with your actual port)

4. **You'll get a URL like:**
   ```
   https://random-name-here.trycloudflare.com
   ```

5. **Share this URL with client** — they can open it on any device

**Note:** This only works while your laptop is ON and the dev server is running. For permanent hosting, use Vercel (Option 1).

---

## Database (Required for Both Options)

### Free Cloud PostgreSQL Options:

#### Option A: Neon (Recommended — Free 500MB)
1. Go to https://neon.tech
2. Sign up (free)
3. Create a new project
4. Copy the connection string:
   ```
   postgresql://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/pte_platform?sslmode=require
   ```
5. Use this as `DATABASE_URL` in Vercel environment variables

#### Option B: Supabase (Free 500MB)
1. Go to https://supabase.com
2. Create a new project
3. Go to Settings > Database > Connection String
4. Copy the URI format string

#### Option C: Railway (Free $5 credit/month)
1. Go to https://railway.app
2. Create a PostgreSQL database
3. Copy the connection string

### After setting up the database:

Run these commands (from `apps/web` directory):
```bash
# Push schema to cloud database
DATABASE_URL="your-cloud-db-url" npx prisma db push

# Seed test data
DATABASE_URL="your-cloud-db-url" npx tsx prisma/seed.ts
```

---

## Quick Deploy Checklist

- [ ] Create Neon.tech account → get DATABASE_URL
- [ ] Create Vercel account (login with GitHub)
- [ ] Import DSIC repo on Vercel
- [ ] Set Root Directory to `apps/web`
- [ ] Add DATABASE_URL in environment variables
- [ ] Add NEXTAUTH_SECRET (any random long string)
- [ ] Add NEXTAUTH_URL (your vercel URL)
- [ ] Deploy
- [ ] Run `prisma db push` with cloud DATABASE_URL
- [ ] Run seed script
- [ ] Test login with student@test.com / student123
- [ ] Share URL with client

---

## After Deployment — Share with Client

Send this to the client:

```
Hi,

PTE Master is ready for testing! Here are the details:

Website: https://[your-url].vercel.app

Test Accounts:
- Student Login: student@test.com / student123
- Centre Admin: admin@divinesuccess.com / centre123

Your Centre Code: divine-success
Students can register at: https://[your-url].vercel.app/register?centre=divine-success

Everything is FREE during beta. Please share with your students and
give us feedback using the Feedback button in the app.

The full guide is here: [share CLIENT_GUIDE.md link or PDF]
```
