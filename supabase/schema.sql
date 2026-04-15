-- TipTrack Schema
-- Paste this into Supabase SQL Editor and run it

-- VENUES
create table if not exists public.venues (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  tip_out_roles jsonb default '[]'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.venues enable row level security;

create policy "Users manage their own venues"
  on public.venues for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- SHIFTS
create table if not exists public.shifts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  venue_id uuid references public.venues(id) on delete set null,
  venue_name text not null,
  shift_date date not null,
  hours numeric(4,2) not null,
  cash_tips numeric(10,2) not null default 0,
  credit_tips numeric(10,2) not null default 0,
  tip_outs jsonb default '[]'::jsonb,
  total_tip_out numeric(10,2) not null default 0,
  take_home numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.shifts enable row level security;

create policy "Users manage their own shifts"
  on public.shifts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- INDEXES
create index if not exists shifts_user_id_date_idx on public.shifts(user_id, shift_date desc);
create index if not exists shifts_venue_id_idx on public.shifts(venue_id);
create index if not exists venues_user_id_idx on public.venues(user_id);

-- UPDATED_AT TRIGGER
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_venues_updated
  before update on public.venues
  for each row execute procedure public.handle_updated_at();

create trigger on_shifts_updated
  before update on public.shifts
  for each row execute procedure public.handle_updated_at();