-- Odczytowa funkcja API do demonstracji żądania POST i payloadu JSON.
-- Funkcja nie zapisuje, nie aktualizuje ani nie usuwa danych.

create or replace function public.get_demo_diagnosis(target_period_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'status', 'ok',
    'period_id', p.id,
    'hotel', h.display_name,
    'period', p.label,
    'confidence', d.confidence_level,
    'diagnosis', d.diagnosis,
    'recommendation', d.recommendation,
    'evidence', d.evidence,
    'is_synthetic', true
  )
  from public.analysis_periods p
  join public.hotels h
    on h.id = p.hotel_id
   and h.is_synthetic = true
  join public.diagnoses d
    on d.period_id = p.id
   and d.scope = 'hotel'
   and d.is_synthetic = true
  where p.id = target_period_id
    and p.is_synthetic = true
  limit 1;
$$;

grant execute on function public.get_demo_diagnosis(uuid)
to anon, authenticated;

