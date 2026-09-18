export type Ga4Metrics = {
  sessions: number;

  engaged_views?: number;
  engaged_sessions: number;
  view_offer_or_room: number;

  step1: number;
  step2: number;
  step3: number;

  ga4_unique_purchases: number;

  new_users?: number;
  returning_users?: number;
};

export type ProfitroomMetrics = {
  direct_created_bookings: number;
  direct_active_bookings: number;
  direct_active_revenue: number;

  booking_com_active_bookings: number;
  booking_com_active_revenue: number;

  expedia_active_bookings: number;
  expedia_active_revenue: number;

  hrs_active_bookings: number;
  hrs_active_revenue: number;

  other_ota_active_bookings: number;
  other_ota_active_revenue: number;

  active_online_bookings: number;
  active_online_revenue: number;

  profitroom_data_through: string | null;
};

export type MetaMetrics = {
  spend: number;
  impressions: number;
  clicks: number;

  platform_conversions: number;
  attributed_conversion_value: number;
};

export type GoogleAdsMetrics = {
  cost: number;
  impressions: number;
  clicks: number;

  conversions: number;
  conversion_value: number;

  brand_clicks?: number;
  generic_clicks?: number;
};

export type DiagnosticPeriod = {
  start_date: string;
  end_date: string;

  ga4: Ga4Metrics;
  profitroom: ProfitroomMetrics;
  meta: MetaMetrics;
  google_ads: GoogleAdsMetrics;
};

export type DiagnosticInput = {
  hotel_id: string;

  current: DiagnosticPeriod;
  comparison: DiagnosticPeriod;
};
