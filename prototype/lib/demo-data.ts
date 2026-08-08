// Syntetyczne dane prezentacyjne. Supabase nie jest źródłem analityki.
// W przyszłości ten moduł może zostać zastąpiony adapterem BigQuery.

export const DEMO_HOTEL_ID = "10000000-0000-4000-8000-000000000001";

export const demoPeriods = [
  { id: "20000000-0000-4000-8000-000000000001", hotel_id: DEMO_HOTEL_ID, label: "18–31 lipca 2026 vs 4–17 lipca 2026", current_start: "2026-07-18", current_end: "2026-07-31", comparison_start: "2026-07-04", comparison_end: "2026-07-17" },
  { id: "20000000-0000-4000-8000-000000000002", hotel_id: DEMO_HOTEL_ID, label: "4–17 lipca 2026 vs 20 czerwca–3 lipca 2026", current_start: "2026-07-04", current_end: "2026-07-17", comparison_start: "2026-06-20", comparison_end: "2026-07-03" },
];

export const demoCampaigns = [
  { id: "30000000-0000-4000-8000-000000000006", hotel_id: DEMO_HOTEL_ID, campaign_name: "Meta Ads | Łącznie", channel: "Meta Ads", status: "Problem dalej w lejku" },
  { id: "30000000-0000-4000-8000-000000000002", hotel_id: DEMO_HOTEL_ID, campaign_name: "Google Brand", channel: "Google Ads", status: "Działa dobrze" },
  { id: "30000000-0000-4000-8000-000000000005", hotel_id: DEMO_HOTEL_ID, campaign_name: "Search Non-brand", channel: "Google Ads", status: "Działa dobrze" },
];

export const demoCampaignMetrics = [
  { campaign_id: demoCampaigns[0].id, period_id: demoPeriods[1].id, hotel_id: DEMO_HOTEL_ID, spend: 5600, sessions: 2050, engaged_sessions: 1300, offer_views: 540, step2: 108, step3: 60, engagement_rate: 63.41, medium_high_intent_events: 168, package_bookings: 4, booking_value: 8100 },
  { campaign_id: demoCampaigns[0].id, period_id: demoPeriods[0].id, hotel_id: DEMO_HOTEL_ID, spend: 6000, sessions: 2350, engaged_sessions: 1575, offer_views: 680, step2: 142, step3: 82, engagement_rate: 67.02, medium_high_intent_events: 224, package_bookings: 4, booking_value: 8800 },
  { campaign_id: demoCampaigns[1].id, period_id: demoPeriods[1].id, hotel_id: DEMO_HOTEL_ID, spend: 2300, sessions: 720, engaged_sessions: 540, offer_views: 214, step2: 76, step3: 48, engagement_rate: 75, medium_high_intent_events: 124, package_bookings: 8, booking_value: 18800 },
  { campaign_id: demoCampaigns[1].id, period_id: demoPeriods[0].id, hotel_id: DEMO_HOTEL_ID, spend: 2500, sessions: 850, engaged_sessions: 655, offer_views: 268, step2: 94, step3: 61, engagement_rate: 77.06, medium_high_intent_events: 155, package_bookings: 9, booking_value: 21600 },
  { campaign_id: demoCampaigns[2].id, period_id: demoPeriods[1].id, hotel_id: DEMO_HOTEL_ID, spend: 1400, sessions: 430, engaged_sessions: 280, offer_views: 96, step2: 31, step3: 19, engagement_rate: 65.12, medium_high_intent_events: 50, package_bookings: 2, booking_value: 4700 },
  { campaign_id: demoCampaigns[2].id, period_id: demoPeriods[0].id, hotel_id: DEMO_HOTEL_ID, spend: 1500, sessions: 470, engaged_sessions: 315, offer_views: 110, step2: 37, step3: 22, engagement_rate: 67.02, medium_high_intent_events: 59, package_bookings: 2, booking_value: 4800 },
];

export const demoFunnelMetrics = [
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[0].id, period_variant: "current" as const, entries: 7900, engaged_sessions: 5100, package_opens: 1840, date_searches: 1080, step1: 720, step2: 410, step3: 245, purchases: 73 },
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[0].id, period_variant: "comparison" as const, entries: 7200, engaged_sessions: 4480, package_opens: 1570, date_searches: 930, step1: 620, step2: 335, step3: 198, purchases: 64 },
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[1].id, period_variant: "current" as const, entries: 7200, engaged_sessions: 4480, package_opens: 1570, date_searches: 930, step1: 620, step2: 335, step3: 198, purchases: 64 },
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[1].id, period_variant: "comparison" as const, entries: 6810, engaged_sessions: 4140, package_opens: 1430, date_searches: 850, step1: 570, step2: 302, step3: 174, purchases: 58 },
];

export const demoHotelSales = [
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[1].id, channel: "Direct" as const, bookings: 64, revenue: 151000 },
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[1].id, channel: "Booking.com" as const, bookings: 83, revenue: 178000 },
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[1].id, channel: "Other OTA" as const, bookings: 23, revenue: 46000 },
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[1].id, channel: "Phone" as const, bookings: 27, revenue: 63000 },
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[1].id, channel: "Email" as const, bookings: 17, revenue: 41000 },
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[0].id, channel: "Direct" as const, bookings: 73, revenue: 178000 },
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[0].id, channel: "Booking.com" as const, bookings: 92, revenue: 201000 },
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[0].id, channel: "Other OTA" as const, bookings: 24, revenue: 49000 },
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[0].id, channel: "Phone" as const, bookings: 31, revenue: 75000 },
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[0].id, channel: "Email" as const, bookings: 18, revenue: 46000 },
];

export const demoContactMetrics = [
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[0].id, period_variant: "current" as const, phone_clicks: 74, calls_started: 43, confirmed_calls: 18, one_night_inquiries: 13 },
  { hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[0].id, period_variant: "comparison" as const, phone_clicks: 49, calls_started: 31, confirmed_calls: 14, one_night_inquiries: 5 },
];

export const demoChannelPaths = [
  { id: "path-1", hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[0].id, path_label: "Meta Ads → Google Brand → Direct → telefon", path_count: 7, outcome: "phone", confidence_level: "high_probability" },
  { id: "path-2", hotel_id: DEMO_HOTEL_ID, period_id: demoPeriods[0].id, path_label: "Google Brand → Direct → rezerwacja", path_count: 4, outcome: "booking", confidence_level: "high_probability" },
];
