# TipTrack

A mobile tip tracking app for bartenders and servers who deserve to know what they actually made.

Built with React Native, Expo, and Supabase. Available on the App Store.

---

## The Problem

Bartenders and servers earn inconsistent income from cash tips, credit card tips, and mandatory tip-outs to support staff. Most track earnings using memory, notes apps, or pen and paper. Without clear visibility into actual take-home pay, it is nearly impossible to budget, plan savings, or know which shifts and venues are worth the effort.

## The Solution

TipTrack lets tipped workers log complete shifts in under 30 seconds, calculates tip-outs automatically, and gives a clear view of weekly and monthly earnings across multiple venues.

---

## Features

- **Auth** - Email sign up, login, forgot password, and account deletion with session persistence via AsyncStorage
- **Dashboard** - Weekly take-home hero number, all-time stats, recent shifts with effective hourly rate, and delete account
- **Log Shift** - Date, venue, shift type (day/night), hours, cash and credit tips, optional sales, notes, with live tip-out breakdown and real-time take-home calculation
- **Venues** - Create venues with base hourly wage, optional sales tracking toggle, and fully custom tip-out roles (name, percentage, applies to total or credit tips)
- **History** - Full shift log filtered by week, month, or all time. Tap any shift to expand the full breakdown. Edit and delete shifts. CSV export.
- **Analytics** - Week-over-week comparison, earnings by day of week, monthly totals over 6 months, and venue breakdown
- **Cloud sync** - All data synced via Supabase with row-level security so users only ever see their own data

---

## Stack

- React Native + Expo (~54)
- TypeScript
- Supabase (PostgreSQL + Auth + RLS + Edge Functions)
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

6. Create a `.env` file in the root with your service role key

```
EXPO_PUBLIC_SERVICE_ROLE_KEY=your-service-role-key
```

7. Start the app

```bash
npx expo start
```

8. Scan the QR code with Expo Go on your phone

---

## Project Structure

```
tiptrack-app/
  App.tsx
  index.ts
  .env
  src/
    lib/
      supabase.ts
    navigation/
      AppNavigator.tsx
    screens/
      DashboardScreen.tsx
      LogShiftScreen.tsx
      HistoryScreen.tsx
      AnalyticsScreen.tsx
      VenuesScreen.tsx
      LoginScreen.tsx
      OnboardingScreen.tsx
  supabase/
    schema.sql
    functions/
      delete-user/
        index.ts
```

---

Built by [Justin Adame](https://justinadame.com) - UX Designer and Frontend Developer based in Austin, TX.