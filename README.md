# TipTrack

A mobile tip tracking app for bartenders who deserve to know what they actually made.

Built with React Native, Expo, and Supabase.

---

## The Problem

Bartenders earn inconsistent income from cash tips, credit card tips, and mandatory tip-outs to support staff. Most track earnings using memory, notes apps, or pen and paper. Without clear visibility into actual take-home pay, it's nearly impossible to budget, plan savings, or know which shifts and venues are worth the effort.

## The Solution

TipTrack lets bartenders log complete shifts in under 30 seconds, calculates tip-outs automatically, and gives a clear view of weekly and monthly earnings across multiple venues.

---

## Features

- **Auth** - Email sign up and login with session persistence via AsyncStorage
- **Dashboard** - Weekly take-home hero number, all-time stats, recent shifts with effective hourly rate
- **Log Shift** - Date, venue, hours, cash and credit tips with live tip-out breakdown and real-time take-home calculation
- **Venues** - Create venues with fully custom tip-out roles (name, percentage, applies to total or credit tips)
- **History** - Full shift log filtered by week, month, or all time. Tap any shift to expand the full breakdown including effective hourly rate. Delete shifts.
- **Cloud sync** - All data synced via Supabase with row-level security so users only ever see their own data

---

## Stack

- React Native + Expo
- TypeScript
- Supabase (PostgreSQL + Auth + RLS)
- React Navigation (Bottom Tabs + Native Stack)
- AsyncStorage

---

## Running Locally

1. Clone the repo

```bash
git clone https://github.com/jradame/tiptrack-app.git
cd tiptrack-app
```

2. Install dependencies

```bash
npm install
```

3. Create a free project at [supabase.com](https://supabase.com)

4. Paste `supabase/schema.sql` into the Supabase SQL Editor and run it

5. Add your Supabase credentials to `src/lib/supabase.ts`

```ts
const SUPABASE_URL = 'your-project-url'
const SUPABASE_ANON_KEY = 'your-anon-key'
```

6. Start the app

```bash
npx expo start
```

7. Scan the QR code with Expo Go on your phone

---

## Project Structure

```
tiptrack-app/
  App.tsx
  index.ts
  src/
    lib/
      supabase.ts
    navigation/
      AppNavigator.tsx
    screens/
      DashboardScreen.tsx
      LogShiftScreen.tsx
      HistoryScreen.tsx
      VenuesScreen.tsx
      LoginScreen.tsx
  supabase/
    schema.sql
```

---

## Roadmap

- Tax estimate tracking for IRS tip reporting
- Base wage + tips for total compensation per shift
- Credit card processing fee deduction
- CSV export for tax filing and records
- Shift logging reminders via push notification
- Effective hourly rate chart across venues

---

Built by [Justin Adame](https://justinadame.com) - UX Designer and Frontend Developer based in Austin, TX.