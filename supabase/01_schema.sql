-- Hotel Marketing Analyzer
-- Demonstracyjny schemat Supabase/PostgreSQL.
-- Nie zawiera tabel klientów, gości ani innych danych osobowych.

create extension if not exists pgcrypto;

create table if not exists public.hotels (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  city text not null,
  currency_code text not null default 'PLN'
    check (currency_code = 'PLN'),
  is_synthetic boolean not null default true
    check (is_synthetic = true),
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_periods (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  label text not null,
  current_start date not null,
  current_end date not null,
  comparison_start date not null,
  comparison_end date not null,
  is_synthetic boolean not null default true
    check (is_synthetic = true),
  created_at timestamptz not null default now(),
  check (current_start <= current_end),
  check (comparison_start <= comparison_end),
  check ((current_end - current_start) = (comparison_end - comparison_start))
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  campaign_name text not null,
  channel text not null check (channel in ('Meta Ads', 'Google Ads')),
  audience_type text not null
    check (audience_type in ('cold', 'remarketing', 'short_term', 'brand', 'search')),
  status text not null,
  is_synthetic boolean not null default true
    check (is_synthetic = true),
  created_at timestamptz not null default now(),
  unique (hotel_id, campaign_name)
);

create table if not exists public.campaign_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  period_id uuid not null references public.analysis_periods(id) on delete cascade,
  spend numeric(12,2) not null check (spend >= 0),
  sessions integer not null check (sessions >= 0),
  engagement_rate numeric(5,2) not null check (engagement_rate between 0 and 100),
  impressions integer not null check (impressions >= 0),
  clicks integer not null check (clicks >= 0),
  ctr numeric(6,3) not null check (ctr between 0 and 100),
  cpc numeric(10,2) not null check (cpc >= 0),
  frequency numeric(6,2) check (frequency >= 0),
  medium_high_intent_events integer not null check (medium_high_intent_events >= 0),
  confirmed_contacts integer not null check (confirmed_contacts >= 0),
  package_bookings integer not null check (package_bookings >= 0),
  booking_value numeric(12,2) not null check (booking_value >= 0),
  is_synthetic boolean not null default true
    check (is_synthetic = true),
  created_at timestamptz not null default now(),
  unique (campaign_id, period_id),
  check (clicks <= impressions),
  check (confirmed_contacts <= medium_high_intent_events),
  check (package_bookings <= medium_high_intent_events)
);

create table if not exists public.funnel_metrics (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  period_id uuid not null references public.analysis_periods(id) on delete cascade,
  period_variant text not null check (period_variant in ('current', 'comparison')),
  entries integer not null check (entries >= 0),
  engaged_sessions integer not null check (engaged_sessions >= 0),
  package_opens integer not null check (package_opens >= 0),
  date_searches integer not null check (date_searches >= 0),
  step1 integer not null check (step1 >= 0),
  step2 integer not null check (step2 >= 0),
  step3 integer not null check (step3 >= 0),
  purchases integer not null check (purchases >= 0),
  is_synthetic boolean not null default true
    check (is_synthetic = true),
  created_at timestamptz not null default now(),
  unique (period_id, period_variant),
  check (engaged_sessions <= entries),
  check (package_opens <= engaged_sessions),
  check (date_searches <= package_opens),
  check (step1 <= date_searches),
  check (step2 <= step1),
  check (step3 <= step2),
  check (purchases <= step3)
);

create table if not exists public.contact_metrics (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  period_id uuid not null references public.analysis_periods(id) on delete cascade,
  period_variant text not null check (period_variant in ('current', 'comparison')),
  phone_clicks integer not null check (phone_clicks >= 0),
  calls_started integer not null check (calls_started >= 0),
  confirmed_calls integer not null check (confirmed_calls >= 0),
  one_night_inquiries integer not null check (one_night_inquiries >= 0),
  is_synthetic boolean not null default true
    check (is_synthetic = true),
  created_at timestamptz not null default now(),
  unique (period_id, period_variant),
  check (calls_started <= phone_clicks),
  check (confirmed_calls <= calls_started),
  check (one_night_inquiries <= confirmed_calls)
);

create table if not exists public.channel_paths (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  period_id uuid not null references public.analysis_periods(id) on delete cascade,
  path_label text not null,
  path_count integer not null check (path_count >= 0),
  outcome text not null
    check (outcome in ('phone', 'booking', 'date_search')),
  confidence_level text not null
    check (confidence_level in ('confirmed', 'high_probability', 'to_verify')),
  is_synthetic boolean not null default true
    check (is_synthetic = true),
  created_at timestamptz not null default now()
);

create table if not exists public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  period_id uuid not null references public.analysis_periods(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  scope text not null check (scope in ('hotel', 'campaign')),
  confidence_level text not null
    check (confidence_level in ('confirmed', 'high_probability', 'to_verify', 'insufficient_data')),
  diagnosis text not null,
  recommendation text not null,
  evidence jsonb not null default '[]'::jsonb
    check (jsonb_typeof(evidence) = 'array'),
  is_synthetic boolean not null default true
    check (is_synthetic = true),
  created_at timestamptz not null default now()
);

create table if not exists public.evaluation_thresholds (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  cold_frequency numeric(4,2) not null default 2.0,
  remarketing_frequency numeric(4,2) not null default 5.0,
  short_term_frequency numeric(4,2) not null default 3.0,
  minimum_runtime_days integer not null default 3 check (minimum_runtime_days > 0),
  minimum_spend numeric(10,2) not null default 150 check (minimum_spend >= 0),
  minimum_basic_sessions integer not null default 50 check (minimum_basic_sessions > 0),
  minimum_quality_sessions integer not null default 150 check (minimum_quality_sessions > 0),
  minimum_intent_events integer not null default 20 check (minimum_intent_events > 0),
  minimum_bookings integer not null default 3 check (minimum_bookings > 0),
  minimum_roas numeric(5,2) not null default 4.0 check (minimum_roas >= 0),
  maximum_booking_cost numeric(10,2) not null default 450 check (maximum_booking_cost >= 0),
  is_synthetic boolean not null default true
    check (is_synthetic = true),
  created_at timestamptz not null default now(),
  unique (hotel_id)
);

-- RLS jest włączone od początku. Przed integracją nie tworzymy polityk
-- dostępu dla roli anon ani authenticated.
alter table public.hotels enable row level security;
alter table public.analysis_periods enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_metrics enable row level security;
alter table public.funnel_metrics enable row level security;
alter table public.contact_metrics enable row level security;
alter table public.channel_paths enable row level security;
alter table public.diagnoses enable row level security;
alter table public.evaluation_thresholds enable row level security;

