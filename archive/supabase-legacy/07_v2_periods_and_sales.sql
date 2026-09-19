-- Hotel Marketing Analyzer v2: bezpieczne, addytywne rozszerzenie demo.
-- Uruchom po 01-06. Skrypt nie usuwa tabel ani danych.

begin;

alter table public.campaign_metrics
  add column if not exists hotel_id uuid references public.hotels(id) on delete cascade,
  add column if not exists engaged_sessions integer check (engaged_sessions >= 0),
  add column if not exists offer_views integer check (offer_views >= 0),
  add column if not exists step2 integer check (step2 >= 0),
  add column if not exists step3 integer check (step3 >= 0);

update public.campaign_metrics metric
set hotel_id = campaign.hotel_id
from public.campaigns campaign
where metric.campaign_id = campaign.id
  and metric.hotel_id is null;

alter table public.campaign_metrics alter column hotel_id set not null;

create table if not exists public.hotel_sales_metrics (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  period_id uuid not null references public.analysis_periods(id) on delete cascade,
  channel text not null
    check (channel in ('Direct', 'Booking.com', 'Other OTA', 'Phone', 'Email')),
  bookings integer not null check (bookings >= 0),
  revenue numeric(12,2) not null check (revenue >= 0),
  is_synthetic boolean not null default true check (is_synthetic = true),
  created_at timestamptz not null default now(),
  unique (period_id, channel)
);

alter table public.hotel_sales_metrics enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'hotel_sales_metrics'
      and policyname = 'Publiczny odczyt syntetycznej sprzedaży hotelu'
  ) then
    create policy "Publiczny odczyt syntetycznej sprzedaży hotelu"
      on public.hotel_sales_metrics for select to anon, authenticated
      using (is_synthetic = true);
  end if;
end $$;

-- Dwa wybieralne snapshoty. Nowszy porównuje się z poprzednim.
insert into public.analysis_periods (
  id, hotel_id, label, current_start, current_end,
  comparison_start, comparison_end
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '18–31 lipca 2026 vs 4–17 lipca 2026',
    '2026-07-18', '2026-07-31', '2026-07-04', '2026-07-17'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '4–17 lipca 2026 vs 20 czerwca–3 lipca 2026',
    '2026-07-04', '2026-07-17', '2026-06-20', '2026-07-03'
  )
on conflict (id) do update set
  hotel_id = excluded.hotel_id,
  label = excluded.label,
  current_start = excluded.current_start,
  current_end = excluded.current_end,
  comparison_start = excluded.comparison_start,
  comparison_end = excluded.comparison_end;

insert into public.campaigns (
  id, hotel_id, campaign_name, channel, audience_type, status
)
values
  ('30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'Meta Ads | Łącznie', 'Meta Ads', 'cold', 'Problem dalej w lejku'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Google Brand', 'Google Ads', 'brand', 'Działa dobrze'),
  ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Search Non-brand', 'Google Ads', 'search', 'Działa dobrze')
on conflict (id) do update set
  hotel_id = excluded.hotel_id,
  campaign_name = excluded.campaign_name,
  channel = excluded.channel,
  audience_type = excluded.audience_type,
  status = excluded.status;

insert into public.campaign_metrics (
  campaign_id, period_id, hotel_id, spend, sessions, engaged_sessions,
  offer_views, step2, step3, engagement_rate, impressions, clicks, ctr,
  cpc, frequency, medium_high_intent_events, confirmed_contacts,
  package_bookings, booking_value
)
values
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 5600, 2050, 1300, 540, 108, 60, 63.41, 244000, 3520, 1.443, 1.59, 2.20, 168, 4, 4, 8100),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 6000, 2350, 1575, 680, 142, 82, 67.02, 258000, 3850, 1.492, 1.56, 2.35, 224, 4, 4, 8800),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 2300, 720, 540, 214, 76, 48, 75.00, 32600, 1280, 3.926, 1.80, 1.35, 124, 8, 8, 18800),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 2500, 850, 655, 268, 94, 61, 77.06, 35100, 1395, 3.974, 1.79, 1.42, 155, 9, 9, 21600),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 1400, 430, 280, 96, 31, 19, 65.12, 28400, 610, 2.148, 2.30, null, 50, 2, 2, 4700),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 1500, 470, 315, 110, 37, 22, 67.02, 30100, 650, 2.159, 2.31, null, 59, 2, 2, 4800)
on conflict (campaign_id, period_id) do update set
  hotel_id = excluded.hotel_id,
  spend = excluded.spend,
  sessions = excluded.sessions,
  engaged_sessions = excluded.engaged_sessions,
  offer_views = excluded.offer_views,
  step2 = excluded.step2,
  step3 = excluded.step3,
  engagement_rate = excluded.engagement_rate,
  impressions = excluded.impressions,
  clicks = excluded.clicks,
  ctr = excluded.ctr,
  cpc = excluded.cpc,
  frequency = excluded.frequency,
  medium_high_intent_events = excluded.medium_high_intent_events,
  confirmed_contacts = excluded.confirmed_contacts,
  package_bookings = excluded.package_bookings,
  booking_value = excluded.booking_value;

insert into public.funnel_metrics (
  hotel_id, period_id, period_variant, entries, engaged_sessions,
  package_opens, date_searches, step1, step2, step3, purchases
)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'current', 7900, 5100, 1840, 1080, 720, 410, 245, 73),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'comparison', 7200, 4480, 1570, 930, 620, 335, 198, 64),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'current', 7200, 4480, 1570, 930, 620, 335, 198, 64),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'comparison', 6810, 4140, 1430, 850, 570, 302, 174, 58)
on conflict (period_id, period_variant) do update set
  hotel_id = excluded.hotel_id,
  entries = excluded.entries,
  engaged_sessions = excluded.engaged_sessions,
  package_opens = excluded.package_opens,
  date_searches = excluded.date_searches,
  step1 = excluded.step1,
  step2 = excluded.step2,
  step3 = excluded.step3,
  purchases = excluded.purchases;

insert into public.hotel_sales_metrics (
  hotel_id, period_id, channel, bookings, revenue
)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'Direct', 64, 151000),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'Booking.com', 83, 178000),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'Other OTA', 23, 46000),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'Phone', 27, 63000),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'Email', 17, 41000),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Direct', 73, 178000),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Booking.com', 92, 201000),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Other OTA', 24, 49000),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Phone', 31, 75000),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Email', 18, 46000)
on conflict (period_id, channel) do update set
  hotel_id = excluded.hotel_id,
  bookings = excluded.bookings,
  revenue = excluded.revenue;

commit;
