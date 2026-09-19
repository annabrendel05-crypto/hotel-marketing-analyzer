-- Audyt uruchamiany po 01_schema.sql i 02_seed_synthetic.sql.
-- Oczekiwany wynik każdej kontroli opisany jest w komentarzu.

-- 1. Typy kolumn. Wynik należy przejrzeć w całości.
select
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'hotels', 'analysis_periods', 'campaigns', 'campaign_metrics',
    'funnel_metrics', 'contact_metrics', 'channel_paths',
    'diagnoses', 'evaluation_thresholds'
  )
order by table_name, ordinal_position;

-- 2. Każdy rekord musi być oznaczony jako syntetyczny.
-- Oczekiwany wynik: synthetic_false_or_null = 0 w każdym wierszu.
select 'hotels' as table_name, count(*) filter (where is_synthetic is not true) as synthetic_false_or_null from public.hotels
union all select 'analysis_periods', count(*) filter (where is_synthetic is not true) from public.analysis_periods
union all select 'campaigns', count(*) filter (where is_synthetic is not true) from public.campaigns
union all select 'campaign_metrics', count(*) filter (where is_synthetic is not true) from public.campaign_metrics
union all select 'funnel_metrics', count(*) filter (where is_synthetic is not true) from public.funnel_metrics
union all select 'contact_metrics', count(*) filter (where is_synthetic is not true) from public.contact_metrics
union all select 'channel_paths', count(*) filter (where is_synthetic is not true) from public.channel_paths
union all select 'diagnoses', count(*) filter (where is_synthetic is not true) from public.diagnoses
union all select 'evaluation_thresholds', count(*) filter (where is_synthetic is not true) from public.evaluation_thresholds;

-- 3. UUID muszą być niepuste i unikalne.
-- Oczekiwany wynik: total_rows = non_null_ids = unique_ids.
select 'hotels' as table_name, count(*) total_rows, count(id) non_null_ids, count(distinct id) unique_ids from public.hotels
union all select 'analysis_periods', count(*), count(id), count(distinct id) from public.analysis_periods
union all select 'campaigns', count(*), count(id), count(distinct id) from public.campaigns
union all select 'campaign_metrics', count(*), count(id), count(distinct id) from public.campaign_metrics
union all select 'funnel_metrics', count(*), count(id), count(distinct id) from public.funnel_metrics
union all select 'contact_metrics', count(*), count(id), count(distinct id) from public.contact_metrics
union all select 'channel_paths', count(*), count(id), count(distinct id) from public.channel_paths
union all select 'diagnoses', count(*), count(id), count(distinct id) from public.diagnoses
union all select 'evaluation_thresholds', count(*), count(id), count(distinct id) from public.evaluation_thresholds;

-- 4. Kontrola chronologii i logiki lejka.
-- Oczekiwany wynik: zero wierszy.
select *
from public.funnel_metrics
where engaged_sessions > entries
   or package_opens > engaged_sessions
   or date_searches > package_opens
   or step1 > date_searches
   or step2 > step1
   or step3 > step2
   or purchases > step3;

-- 5. Kontrola logiki kontaktów.
-- Oczekiwany wynik: zero wierszy.
select *
from public.contact_metrics
where calls_started > phone_clicks
   or confirmed_calls > calls_started
   or one_night_inquiries > confirmed_calls;

-- 6. Podejrzane nazwy kolumn mogące oznaczać dane osobowe.
-- Oczekiwany wynik: zero wierszy.
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'hotels', 'analysis_periods', 'campaigns', 'campaign_metrics',
    'funnel_metrics', 'contact_metrics', 'channel_paths',
    'diagnoses', 'evaluation_thresholds'
  )
  and (
    column_name ~* '(^|_)(email|phone_number|first_name|last_name|surname|address|pesel|ip_address|user_agent)($|_)'
  );

-- 7. Skan pól tekstowych pod kątem e-maili, telefonów i numerów PESEL.
-- Oczekiwany wynik: zero wierszy.
with text_values as (
  select display_name as value from public.hotels
  union all select city from public.hotels
  union all select campaign_name from public.campaigns
  union all select status from public.campaigns
  union all select path_label from public.channel_paths
  union all select diagnosis from public.diagnoses
  union all select recommendation from public.diagnoses
)
select value
from text_values
where value ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
   or value ~ '(^|[^0-9])(\+?48[ -]?)?[0-9]{3}[ -]?[0-9]{3}[ -]?[0-9]{3}([^0-9]|$)'
   or value ~ '(^|[^0-9])[0-9]{11}([^0-9]|$)';

-- 8. RLS powinno być włączone dla wszystkich tabel demonstracyjnych.
-- Oczekiwany wynik: rowsecurity = true w każdym wierszu.
select relname as table_name, relrowsecurity as rowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'hotels', 'analysis_periods', 'campaigns', 'campaign_metrics',
    'funnel_metrics', 'contact_metrics', 'channel_paths',
    'diagnoses', 'evaluation_thresholds'
  )
order by relname;

