-- Odczytowy audyt fundamentu v2. Oczekiwany wynik: PASS w każdym wierszu.

with checks as (
  select 1 as order_no, 'Zgodność campaign_metrics z hotelem okresu'::text as check_name,
    case when not exists (
      select 1 from public.campaign_metrics metric
      join public.analysis_periods period on period.id = metric.period_id
      join public.campaigns campaign on campaign.id = metric.campaign_id
      where metric.hotel_id <> period.hotel_id
         or campaign.hotel_id <> period.hotel_id
    ) then 'PASS' else 'FAIL' end as status

  union all

  select 2, 'Zgodność funnel_metrics z hotelem okresu',
    case when not exists (
      select 1 from public.funnel_metrics metric
      join public.analysis_periods period on period.id = metric.period_id
      where metric.hotel_id <> period.hotel_id
    ) then 'PASS' else 'FAIL' end

  union all

  select 3, 'Zgodność hotel_sales_metrics z hotelem okresu',
    case when not exists (
      select 1 from public.hotel_sales_metrics metric
      join public.analysis_periods period on period.id = metric.period_id
      where metric.hotel_id <> period.hotel_id
    ) then 'PASS' else 'FAIL' end

  union all

  select 4, 'Sprzedaż 18–31 lipca',
    case when (
      select row(sum(bookings), sum(revenue))
      from public.hotel_sales_metrics
      where period_id = '20000000-0000-4000-8000-000000000001'
    ) = row(238::bigint, 549000::numeric) then 'PASS' else 'FAIL' end

  union all

  select 5, 'Sprzedaż 4–17 lipca',
    case when (
      select row(sum(bookings), sum(revenue))
      from public.hotel_sales_metrics
      where period_id = '20000000-0000-4000-8000-000000000002'
    ) = row(214::bigint, 479000::numeric) then 'PASS' else 'FAIL' end

  union all

  select 6, 'Dwa kompletne snapshoty sprzedaży',
    case when (
      select count(*) from (
        select period_id from public.hotel_sales_metrics
        group by period_id having count(*) = 5
      ) complete_periods
    ) >= 2 then 'PASS' else 'FAIL' end
)
select check_name, status from checks order by order_no;
