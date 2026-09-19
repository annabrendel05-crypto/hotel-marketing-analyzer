-- Wyłącznie syntetyczne dane demonstracyjne.
-- Skrypt nie wykorzystuje żadnych danych produkcyjnych ani osobowych.

begin;

insert into public.hotels (id, display_name, city)
values (
  '10000000-0000-4000-8000-000000000001',
  'Hotel X',
  'Gdynia'
);

insert into public.analysis_periods (
  id, hotel_id, label, current_start, current_end,
  comparison_start, comparison_end
)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '17–23 lipca 2026 vs 10–16 lipca 2026',
  '2026-07-17', '2026-07-23',
  '2026-07-10', '2026-07-16'
);

insert into public.campaigns (
  id, hotel_id, campaign_name, channel, audience_type, status
)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Wakacje w Gdyni | Prospecting', 'Meta Ads', 'cold', 'Problem dalej w lejku'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Brand | Hotel X', 'Google Ads', 'brand', 'Działa dobrze'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Wakacje | Remarketing', 'Meta Ads', 'remarketing', 'Wstępny potencjał'),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Weekend nad morzem', 'Meta Ads', 'short_term', 'Przepalanie budżetu'),
  ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Wakacje w Gdyni | Search', 'Google Ads', 'search', 'Za mało danych');

insert into public.campaign_metrics (
  campaign_id, period_id, spend, sessions, engagement_rate,
  impressions, clicks, ctr, cpc, frequency,
  medium_high_intent_events, confirmed_contacts,
  package_bookings, booking_value
)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 3200, 842, 68, 122400, 1317, 1.076, 2.43, 1.80, 146, 2, 0, 0),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 1650, 391, 76, 21400, 867, 4.051, 1.90, 1.30, 98, 9, 1, 2740),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 1400, 318, 73, 28400, 512, 1.803, 2.73, 3.80, 87, 6, 1, 2740),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 1800, 331, 41, 91200, 471, 0.516, 3.82, 2.70, 9, 1, 0, 0),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 400, 38, 66, 3900, 106, 2.718, 3.77, null, 7, 0, 0, 0);

insert into public.funnel_metrics (
  hotel_id, period_id, period_variant, entries, engaged_sessions,
  package_opens, date_searches, step1, step2, step3, purchases
)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'current', 1920, 1242, 612, 291, 184, 10, 6, 2),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'comparison', 1714, 1080, 519, 240, 163, 16, 10, 7);

insert into public.contact_metrics (
  hotel_id, period_id, period_variant, phone_clicks, calls_started,
  confirmed_calls, one_night_inquiries
)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'current', 74, 43, 18, 13),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'comparison', 49, 31, 14, 5);

insert into public.channel_paths (
  hotel_id, period_id, path_label, path_count, outcome, confidence_level
)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Meta Ads → Google Brand → Direct → telefon', 7, 'phone', 'high_probability'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Meta Ads → Google Brand → rezerwacja', 4, 'booking', 'high_probability'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Meta Remarketing → Direct → rezerwacja', 3, 'booking', 'high_probability'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Google Search → Direct → wybór terminu', 2, 'date_search', 'high_probability');

insert into public.diagnoses (
  hotel_id, period_id, campaign_id, scope, confidence_level,
  diagnosis, recommendation, evidence
)
values (
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  null,
  'hotel',
  'high_probability',
  'Pakiet budzi zainteresowanie, ale rezerwacja zatrzymuje się w silniku.',
  'Nie zwiększaj całego budżetu. Sprawdź step2, dostępność i warunki pobytu na jedną noc.',
  '["rezerwacje: 7 → 2", "wybory terminu: +21%", "step1 → step2: 9,8% → 5,4%"]'::jsonb
);

insert into public.evaluation_thresholds (
  hotel_id, cold_frequency, remarketing_frequency, short_term_frequency
)
values (
  '10000000-0000-4000-8000-000000000001',
  2.0, 5.0, 3.0
);

commit;

