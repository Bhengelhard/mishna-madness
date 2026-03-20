# Mishna Madness

A 64-participant Torah learning tournament modeled after March Madness brackets. Participants earn points by learning Mishnayos, with multipliers for special Masechtas and Sedarim. After each round, the higher scorer advances.

## Features

- **Registration Flow** -- Public signup, admin management, configurable deadlines
- **Bracket Generation** -- Random seeding, auto-generated matchups across 6 rounds (supports 16/32/64 participants)
- **Score Submission** -- Mobile-first form with real-time point preview, multiplier display, and running totals
- **Scoring Engine** -- 1 point per Mishnah, 3x for special Masechta, 2x for special Seder
- **Bracket Visualization** -- Mobile swipeable round-by-round view + desktop traditional bracket tree
- **Admin Dashboard** -- Full tournament management with score overrides, round configuration, participant CRUD
- **Participant Dashboard** -- Current matchup, score comparison, past results, submission history
- **Automated Notifications** -- Round start, 5PM/9PM reminders, late grace period alerts, round results via Resend
- **Cron-based Round Progression** -- Automatic winner determination, bracket advancement, and notifications

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js Server Actions + API Routes
- **Database**: Supabase (PostgreSQL)
- **Email**: Resend
- **Hosting**: Vercel-ready

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd mishna-madness
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migration in the Supabase SQL editor:

```bash
# Copy the contents of supabase/migrations/001_initial_schema.sql
# and run it in your Supabase project's SQL editor
```

3. Copy your project URL and keys from Project Settings > API

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in the values:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `RESEND_API_KEY` | Your Resend API key for emails |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g., `http://localhost:3000`) |
| `ADMIN_PASSWORD` | Password for admin dashboard access |
| `CRON_SECRET` | Secret for authenticating cron job endpoints |
| `APP_TIMEZONE` | Timezone for scheduling (default: `America/New_York`) |

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Deploy to Vercel

1. Push your repo to GitHub
2. Import to Vercel
3. Add all environment variables in Vercel project settings
4. Cron jobs are configured in `vercel.json` and will run automatically on Vercel

## Scoring Rules

- **Base**: 1 point per Mishnah learned
- **Special Masechta (3x)**: Each matchup has an assigned Masechta. Learning from it earns 3x points per Mishnah.
- **Special Seder (2x)**: Each round has an assigned Seder. Learning from any Masechta in that Seder earns 2x points per Mishnah.
- **Priority**: If a Mishnah is from both the special Masechta AND the special Seder, only the 3x multiplier applies (it does not stack to 6x).

## Tournament Flow

1. **Registration**: Admin creates tournament, participants sign up
2. **Bracket Generation**: Admin generates bracket (random seeding, 63 unique Masechta assignments)
3. **Rounds**: Each round has a start date and end date
   - Participants submit their learning (which Masechta, how many Mishnayos)
   - Multiple submissions per round are allowed
   - Late submissions accepted until noon the day after the deadline (flagged)
4. **Reminders**: Automated emails at 5PM (day before), 9PM (deadline day), 8AM (late grace)
5. **Finalization**: At noon after the grace period, winners are determined, losers eliminated, next round created
6. **Championship**: After 6 rounds, one champion remains

## Project Structure

```
src/
  app/
    page.tsx              # Home page
    register/page.tsx     # Registration form
    login/page.tsx        # Participant login
    submit/page.tsx       # Score submission (mobile-first)
    bracket/page.tsx      # Public bracket view
    dashboard/page.tsx    # Participant dashboard
    admin/
      page.tsx            # Admin dashboard
      login/page.tsx      # Admin login
    api/cron/
      reminders/route.ts  # Reminder email cron
      finalize/route.ts   # Round finalization cron
  components/
    header.tsx            # Responsive navigation
    bracket-view.tsx      # Bracket visualization
    ui/                   # shadcn/ui components
  lib/
    actions.ts            # Server actions
    bracket.ts            # Bracket generation algorithm
    scoring.ts            # Scoring engine
    notifications.ts      # Email templates via Resend
    mishnah-data.ts       # Complete Mishnah reference (63 masechtas)
    supabase/             # Supabase client setup
    types/database.ts     # Database types
supabase/
  migrations/             # SQL schema
```

## Mishnah Reference Data

The app includes a complete reference of all 63 Masechtas across the 6 Sedarim (Zeraim, Moed, Nashim, Nezikin, Kodashim, Taharos) with accurate Mishnah counts per Masechta for validation.
