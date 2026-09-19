-- Zbiorczy raport audytu. Skrypt wyłącznie odczytuje dane.
-- Oczekiwany wynik: PASS w każdym wierszu.

with
demo_tables as (
  select unnest(array[
    'hotels',
    'analysis_periods',
    'campaigns',
    'campaign_metrics',
    'funnel_metrics',
    'contact_metrics',
    'channel_paths',
    'diagnoses',
    'evaluation_thresholds'
  ]) as table_name
),
synthetic_violations as (
  select count(*) filter (where is_synthetic is not true) as count from public.hotels
  union all select count(*) filter (where is_synthetic is not true) from public.analysis_periods
  union all select count(*) filter (where is_synthetic is not true) from public.campaigns
  union all select count(*) filter (where is_synthetic is not true) from public.campaign_metrics
  union all select count(*) filter (where is_synthetic is not true) from public.funnel_metrics
  union all select count(*) filter (where is_synthetic is not true) from public.contact_metrics
  union all select count(*) filter (where is_synthetic is not true) from public.channel_paths
  union all select count(*) filter (where is_synthetic is not true) from public.diagnoses
  union all select count(*) filter (where is_synthetic is not true) from public.evaluation_thresholds
),
uuid_checks as (
  select count(*) total, count(id) present, count(distinct id) unique_ids from public.hotels
  union all select count(*), count(id), count(distinct id) from public.analysis_periods
  union all select count(*), count(id), count(distinct id) from public.campaigns
  union all select count(*), count(id), count(distinct id) from public.campaign_metrics
  union all select count(*), count(id), count(distinct id) from public.funnel_metrics
  union all select count(*), count(id), count(distinct id) from public.contact_metrics
  union all select count(*), count(id), count(distinct id) from public.channel_paths
  union all select count(*), count(id), count(distinct id) from public.diagnoses
  union all select count(*), count(id), count(distinct id) from public.evaluation_thresholds
),
text_values as (
  select display_name as value from public.hotels
  union all select city from public.hotels
  union all select campaign_name from public.campaigns
  union all select status from public.campaigns
  union all select path_label from public.channel_paths
  union all select diagnosis from public.diagnoses
  union all select recommendation from public.diagnoses
),
checks as (
  select
    1 as order_no,
    'Liczba tabel'::text as check_name,
    case when (
      select count(*)
      from demo_tables d
      join information_schema.tables t
        on t.table_schema = 'public' and t.table_name = d.table_name
    ) = 9 then 'PASS' else 'FAIL' end as status,
    'Oczekiwano 9 tabel demonstracyjnych'::text as details

  union all

  select
    2,
    'Typ kluczy głównych',
    case when not exists (
      select 1
      from demo_tables d
      left join information_schema.columns c
        on c.table_schema = 'public'
       and c.table_name = d.table_name
       and c.column_name = 'id'
      where c.udt_name is distinct from 'uuid'
    ) then 'PASS' else 'FAIL' end,
    'Kolumna id każdej tabeli ma typ uuid'

  union all

  select
    3,
    'Typ znaczników czasu',
    case when not exists (
      select 1
      from demo_tables d
      left join information_schema.columns c
        on c.table_schema = 'public'
       and c.table_name = d.table_name
       and c.column_name = 'created_at'
      where c.udt_name is distinct from 'timestamptz'
    ) then 'PASS' else 'FAIL' end,
    'Kolumna created_at każdej tabeli ma typ timestamptz'

  union all

  select
    4,
    'Unikalność UUID',
    case when not exists (
      select 1 from uuid_checks where total <> present or total <> unique_ids
    ) then 'PASS' else 'FAIL' end,
    'Wszystkie identyfikatory są obecne i unikalne'

  union all

  select
    5,
    'Oznaczenie danych syntetycznych',
    case when coalesce((select sum(count) from synthetic_violations), 0) = 0
      then 'PASS' else 'FAIL' end,
    'Każdy rekord ma is_synthetic = true'

  union all

  select
    6,
    'Integralność lejka',
    case when not exists (
      select 1
      from public.funnel_metrics
      where engaged_sessions > entries
         or package_opens > engaged_sessions
         or date_searches > package_opens
         or step1 > date_searches
         or step2 > step1
         or step3 > step2
         or purchases > step3
    ) then 'PASS' else 'FAIL' end,
    'Kolejne etapy nie przewyższają poprzednich'

  union all

  select
    7,
    'Integralność kontaktów',
    case when not exists (
      select 1
      from public.contact_metrics
      where calls_started > phone_clicks
         or confirmed_calls > calls_started
         or one_night_inquiries > confirmed_calls
    ) then 'PASS' else 'FAIL' end,
    'Połączenia zachowują prawidłową kolejność'

  union all

  select
    8,
    'Kolumny danych osobowych',
    case when not exists (
      select 1
      from information_schema.columns c
      join demo_tables d on d.table_name = c.table_name
      where c.table_schema = 'public'
        and c.column_name ~* '(^|_)(email|phone_number|first_name|last_name|surname|address|pesel|ip_address|user_agent)($|_)'
    ) then 'PASS' else 'FAIL' end,
    'Brak kolumn przeznaczonych na dane osobowe'

  union all

  select
    9,
    'Wzorce danych osobowych w tekście',
    case when not exists (
      select 1
      from text_values
      where value ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
         or value ~ '(^|[^0-9])(\+?48[ -]?)?[0-9]{3}[ -]?[0-9]{3}[ -]?[0-9]{3}([^0-9]|$)'
         or value ~ '(^|[^0-9])[0-9]{11}([^0-9]|$)'
    ) then 'PASS' else 'FAIL' end,
    'Brak e-maili, telefonów i numerów przypominających PESEL'

  union all

  select
    10,
    'Row Level Security',
    case when (
      select count(*)
      from demo_tables d
      join pg_class c
        on c.relnamespace = 'public'::regnamespace
       and c.relname = d.table_name
      where c.relrowsecurity = true
    ) = 9 then 'PASS' else 'FAIL' end,
    'RLS włączone we wszystkich tabelach'
)
select check_name, status, details
from checks
order by order_no;

