import { canonical } from './random.mts';
import { validateDate } from './config.mts';

// Source schema copied in ordinal order from 002a–002d; all fields nullable.
export const metaSchemas = {
  AdCreatives_demo: {
    ID: 'STRING',
    Target: 'STRING',
    Name: 'STRING',
    ApplinkTreatment: 'STRING',
    Body: 'STRING',
    CallToActionType: 'STRING',
    EffectiveInstagramMediaId: 'STRING',
    ImageHash: 'STRING',
    ImageUrl: 'STRING',
    InstagramPermalinkUrl: 'STRING',
    InstagramUserId: 'STRING',
    LinkOgId: 'STRING',
    LinkUrl: 'STRING',
    ObjectId: 'STRING',
    ObjectStoryId: 'STRING',
    ObjectType: 'STRING',
    ObjectUrl: 'STRING',
    PageId: 'STRING',
    ProductSetId: 'STRING',
    RunStatus: 'STRING',
    SourceInstagramMediaId: 'STRING',
    TemplateUrl: 'STRING',
    ThumbnailUrl: 'STRING',
    Title: 'STRING',
    UrlTags: 'STRING',
    AdLabels: 'STRING',
    ObjectStorySpecLinkData: 'JSON',
    ObjectStorySpecPhotoData: 'JSON',
    ObjectStorySpecVideoData: 'JSON',
    ObjectStorySpecTextData: 'JSON',
    ObjectStorySpecTemplateData: 'JSON',
  },
  AdInsights_demo: {
    Target: 'STRING',
    DatePreset: 'STRING',
    DateStart: 'DATE',
    DateEnd: 'DATE',
    TimeIncrement: 'STRING',
    Level: 'STRING',
    AccountCurrency: 'STRING',
    ActionAttributionWindows: 'STRING',
    AdAccountId: 'STRING',
    AdAccountName: 'STRING',
    CampaignId: 'STRING',
    CampaignName: 'STRING',
    AdSetId: 'STRING',
    AdSetName: 'STRING',
    AdId: 'STRING',
    AdName: 'STRING',
    BuyingType: 'STRING',
    Clicks: 'BIGNUMERIC',
    ConversionRateRanking: 'STRING',
    CostPerEstimatedAdRecallers: 'BIGNUMERIC',
    CostPerInlineLinkClick: 'BIGNUMERIC',
    CostPerInlinePostEngagement: 'BIGNUMERIC',
    CostPerUniqueClick: 'BIGNUMERIC',
    CostPerUniqueInlineLinkClick: 'BIGNUMERIC',
    CPC: 'BIGNUMERIC',
    CPM: 'BIGNUMERIC',
    CPP: 'BIGNUMERIC',
    CTR: 'FLOAT64',
    EstimatedAdRecallRate: 'FLOAT64',
    EstimatedAdRecallers: 'FLOAT64',
    Frequency: 'FLOAT64',
    Impressions: 'BIGNUMERIC',
    InlineLinkClicks: 'BIGNUMERIC',
    InlineLinkClicksCounter: 'FLOAT64',
    InlinePostEngagement: 'BIGNUMERIC',
    InstantExperienceClicksToOpen: 'BIGNUMERIC',
    InstantExperienceClicksToStart: 'BIGNUMERIC',
    InstantExperienceOutboundClicks: 'BIGNUMERIC',
    Objective: 'STRING',
    QualityRanking: 'STRING',
    Reach: 'BIGNUMERIC',
    Spend: 'BIGNUMERIC',
    UniqueClicks: 'BIGNUMERIC',
    UniqueCTR: 'FLOAT64',
    UniqueInlineLinkClicks: 'BIGNUMERIC',
    UniqueInlineLinkClickCounter: 'FLOAT64',
    UniqueLinkClicksCounter: 'FLOAT64',
    Checkins: 'INT64',
    EventResponses: 'INT64',
    LinkClicks: 'INT64',
    OfferSaves: 'INT64',
    OutboundClicks: 'INT64',
    PageEngagements: 'INT64',
    PageLikes: 'INT64',
    PageMentions: 'INT64',
    PagePhotoViews: 'INT64',
    PostComments: 'INT64',
    PostEngagements: 'INT64',
    PostShares: 'INT64',
    PostReactions: 'INT64',
    PageTabViews: 'INT64',
    Video3SecondViews: 'INT64',
    AdEffectiveStatus: 'STRING',
    UseAsync: 'BOOL',
    DefaultSummary: 'BOOL',
  },
  AdInsightsActions_demo: {
    Target: 'STRING',
    DatePreset: 'STRING',
    DateStart: 'DATE',
    DateEnd: 'DATE',
    TimeIncrement: 'STRING',
    Level: 'STRING',
    ActionAttributionWindows: 'STRING',
    ActionCollection: 'STRING',
    AdAccountId: 'STRING',
    AdAccountName: 'STRING',
    CampaignId: 'STRING',
    CampaignName: 'STRING',
    AdSetId: 'STRING',
    AdSetName: 'STRING',
    AdId: 'STRING',
    AdName: 'STRING',
    ActionValue: 'FLOAT64',
    Action1dClick: 'STRING',
    Action1dView: 'STRING',
    Action7dClick: 'STRING',
    Action7dView: 'STRING',
    Action28dClick: 'STRING',
    Action28dView: 'STRING',
    ActionDDA: 'STRING',
    AdEffectiveStatus: 'STRING',
    UseAsync: 'BOOL',
    ActionType: 'STRING',
  },
  Ads_demo: {
    ID: 'STRING',
    Target: 'STRING',
    Name: 'STRING',
    AdStatus: 'STRING',
    BidInfo: 'STRING',
    BidType: 'STRING',
    CampaignId: 'STRING',
    AdSetId: 'STRING',
    AdCreativeId: 'STRING',
    ConfiguredStatus: 'STRING',
    CreatedTime: 'TIMESTAMP',
    UpdatedTime: 'TIMESTAMP',
    ConversionSpecs: 'STRING',
    FailedDeliveryChecks: 'STRING',
    Recommendations: 'STRING',
    TrackingSpecs: 'JSON',
    AdActiveTime: 'STRING',
    AdScheduleEndTime: 'TIMESTAMP',
    AdScheduleStartTime: 'TIMESTAMP',
    BidAmount: 'INT64',
    LastUpdatedByAppId: 'STRING',
    PreviewShareableLink: 'STRING',
    SourceAdId: 'STRING',
  },
} as const;
export type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };
export type MetaTable = keyof typeof metaSchemas;
type SqlValue<T> = T extends 'BOOL' ? boolean : T extends 'INT64' | 'FLOAT64' ? number : T extends 'JSON' ? JsonValue : string;
export type MetaRow<T extends MetaTable> = { -readonly [K in keyof typeof metaSchemas[T]]: SqlValue<typeof metaSchemas[T][K]> | null };
export type MetaData = { [T in MetaTable]: MetaRow<T>[] };
export const metaTables = Object.keys(metaSchemas) as MetaTable[];

export function metaRow<T extends MetaTable>(table: T, values: Partial<MetaRow<T>>): MetaRow<T> {
  return Object.assign(Object.fromEntries(Object.keys(metaSchemas[table]).map(k => [k, null])), values) as MetaRow<T>;
}
// Exact decimal strings for BIGNUMERIC: conservative representable subset (38+38 digits).
// INT64 values generated locally stay within the exact JSON number range.
export function validateMetaRow<T extends MetaTable>(table: T, input: unknown): asserts input is MetaRow<T> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected source object');
  const row = input as Record<string, unknown>, schema = metaSchemas[table];
  if (Object.keys(row).length !== Object.keys(schema).length || Object.keys(schema).some(k => !Object.hasOwn(row, k))) throw new Error('Unexpected source columns');
  for (const [key, type] of Object.entries(schema)) {
    const v = row[key];
    if (v === null) continue;
    if (type === 'JSON') { canonical(v); continue; }
    if (type === 'INT64' || type === 'FLOAT64') {
      if (typeof v !== 'number' || !Number.isFinite(v) || (type === 'INT64' && !Number.isSafeInteger(v))) throw new Error(`Invalid ${key}`);
    } else if (type === 'BOOL') {
      if (typeof v !== 'boolean') throw new Error(`Invalid ${key}`);
    } else {
      if (typeof v !== 'string') throw new Error(`Invalid ${key}`);
      if (type === 'BIGNUMERIC' && !/^-?(?:0|[1-9]\d{0,37})(?:\.\d{1,38})?$/.test(v)) throw new Error(`Invalid decimal ${key}`);
      if (type === 'DATE') validateDate(v);
      if (type === 'TIMESTAMP') {
        if (!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?Z$/.test(v)) throw new Error(`Invalid ${key}`);
        validateDate(v.slice(0, 10));
        if (!Number.isFinite(Date.parse(v))) throw new Error(`Invalid ${key}`);
      }
    }
  }
}
export function serializeMetaTable<T extends MetaTable>(table: T, rows: readonly MetaRow<T>[]): string {
  rows.forEach(r => validateMetaRow(table, r));
  // A JSON.stringify key whitelist would discard nested creative JSON properties.
  // Order only the source columns; canonicalize JSON payloads independently.
  const schema = metaSchemas[table];
  return rows.map(row => JSON.stringify(Object.fromEntries(Object.keys(schema).map(k => {
    const v = row[k as keyof typeof row];
    return [k, schema[k as keyof typeof schema] === 'JSON' ? JSON.parse(canonical(v)) : v];
  })))).join('\n') + (rows.length ? '\n' : '');
}
