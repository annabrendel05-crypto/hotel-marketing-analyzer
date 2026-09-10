// DATE columns may include the preceding calendar week (e.g. 1999-12-27
// for an otherwise supported scenario starting 2000-01-01).
function validateSourceDate(date: string): void {
  const epoch = Date.parse(`${date}T00:00:00Z`);
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(epoch) ||
      new Date(epoch).toISOString().slice(0, 10) !== date) throw new Error('Invalid source date');
}

// Exact source query schema, in DDL ordinal order. Every source field is nullable.
export const googleSchemas = {
  Campaign_demo: {
    campaign_id: 'INT64', customer_id: 'INT64', bidding_strategy_name: 'STRING',
    campaign_advertising_channel_sub_type: 'STRING', campaign_advertising_channel_type: 'STRING',
    campaign_bidding_strategy: 'STRING', campaign_bidding_strategy_type: 'STRING',
    campaign_budget_amount_micros: 'INT64', campaign_budget_explicitly_shared: 'BOOL',
    campaign_budget_has_recommended_budget: 'BOOL', campaign_budget_period: 'STRING',
    campaign_budget_recommended_budget_amount_micros: 'INT64', campaign_budget_total_amount_micros: 'INT64',
    campaign_campaign_budget: 'STRING', campaign_end_date_time: 'DATETIME', campaign_experiment_type: 'STRING',
    campaign_manual_cpc_enhanced_cpc_enabled: 'BOOL', campaign_maximize_conversion_value_target_roas: 'FLOAT64',
    campaign_name: 'STRING', campaign_percent_cpc_enhanced_cpc_enabled: 'BOOL', campaign_serving_status: 'STRING',
    campaign_start_date_time: 'DATETIME', campaign_status: 'STRING', campaign_tracking_url_template: 'STRING',
    campaign_url_custom_parameters: 'STRING', _LATEST_DATE: 'DATE', _DATA_DATE: 'DATE',
  },
  CampaignBasicStats_demo: {
    campaign_id: 'INT64', customer_id: 'INT64', campaign_base_campaign: 'STRING', metrics_clicks: 'INT64',
    metrics_conversions: 'FLOAT64', metrics_conversions_value: 'FLOAT64', metrics_cost_micros: 'INT64',
    metrics_impressions: 'INT64', metrics_interaction_event_types: 'STRING', metrics_interactions: 'INT64',
    metrics_view_through_conversions: 'INT64', segments_ad_network_type: 'STRING', segments_date: 'DATE',
    segments_device: 'STRING', segments_slot: 'STRING', _LATEST_DATE: 'DATE', _DATA_DATE: 'DATE',
  },
  CampaignConversionStats_demo: {
    campaign_id: 'INT64', customer_id: 'INT64', campaign_base_campaign: 'STRING', metrics_conversions: 'FLOAT64',
    metrics_conversions_value: 'FLOAT64', metrics_value_per_conversion: 'FLOAT64', segments_ad_network_type: 'STRING',
    segments_conversion_action: 'STRING', segments_conversion_action_category: 'STRING',
    segments_conversion_action_name: 'STRING', segments_conversion_attribution_event_type: 'STRING',
    segments_date: 'DATE', segments_day_of_week: 'STRING', segments_month: 'DATE', segments_quarter: 'DATE',
    segments_slot: 'STRING', segments_week: 'DATE', segments_year: 'INT64', _LATEST_DATE: 'DATE', _DATA_DATE: 'DATE',
  },
  Customer_demo: {
    customer_id: 'INT64', customer_auto_tagging_enabled: 'BOOL', customer_currency_code: 'STRING',
    customer_descriptive_name: 'STRING', customer_manager: 'BOOL', customer_test_account: 'BOOL',
    customer_time_zone: 'STRING', _LATEST_DATE: 'DATE', _DATA_DATE: 'DATE',
  },
} as const;
export type GoogleTable = keyof typeof googleSchemas;
type SqlValue<T> = T extends 'BOOL' ? boolean : T extends 'INT64' | 'FLOAT64' ? number : string;
export type GoogleRow<T extends GoogleTable> = { -readonly [K in keyof typeof googleSchemas[T]]: SqlValue<typeof googleSchemas[T][K]> | null };
export type GoogleData = { [T in GoogleTable]: GoogleRow<T>[] };
export const googleTables = Object.keys(googleSchemas) as GoogleTable[];

export function googleRow<T extends GoogleTable>(table: T, values: Partial<GoogleRow<T>>): GoogleRow<T> {
  return Object.assign(Object.fromEntries(Object.keys(googleSchemas[table]).map(k => [k, null])), values) as GoogleRow<T>;
}
// Number encoding deliberately uses the exactly representable subset of INT64.
// This validates synthetic exports, not arbitrary production INT64 ingestion.
export function validateGoogleRow<T extends GoogleTable>(table: T, input: unknown): asserts input is GoogleRow<T> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected source object');
  const r = input as Record<string, unknown>, schema = googleSchemas[table];
  if (Object.keys(r).length !== Object.keys(schema).length || Object.keys(schema).some(k => !Object.hasOwn(r, k))) {
    throw new Error(`Unexpected source fields: ${table}`);
  }
  for (const [key, type] of Object.entries(schema)) {
    const v = r[key];
    if (v === null) continue;
    if (type === 'INT64' || type === 'FLOAT64') {
      if (typeof v !== 'number' || !Number.isFinite(v) || (type === 'INT64' && !Number.isSafeInteger(v))) throw new Error(`Invalid ${key}`);
    } else if (type === 'BOOL') {
      if (typeof v !== 'boolean') throw new Error(`Invalid ${key}`);
    } else {
      if (typeof v !== 'string') throw new Error(`Invalid ${key}`);
      if (type === 'DATE') validateSourceDate(v);
      if (type === 'DATETIME') {
        if (!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(v)) throw new Error(`Invalid ${key}`);
        validateSourceDate(v.slice(0, 10));
      }
    }
  }
}
export function serializeGoogleTable<T extends GoogleTable>(table: T, rows: readonly GoogleRow<T>[]): string {
  rows.forEach(r => validateGoogleRow(table, r));
  return rows.map(r => JSON.stringify(r, Object.keys(googleSchemas[table]))).join('\n') + (rows.length ? '\n' : '');
}
