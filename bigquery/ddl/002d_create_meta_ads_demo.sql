-- Ads_demo
CREATE TABLE `hotel-marketing-analyzer-demo.meta_ads.Ads_demo`
(
  ID STRING,
  Target STRING,
  Name STRING,
  AdStatus STRING,
  BidInfo STRING,
  BidType STRING,
  CampaignId STRING,
  AdSetId STRING,
  AdCreativeId STRING,
  ConfiguredStatus STRING,
  CreatedTime TIMESTAMP,
  UpdatedTime TIMESTAMP,
  ConversionSpecs STRING,
  FailedDeliveryChecks STRING,
  Recommendations STRING,
  TrackingSpecs JSON,
  AdActiveTime STRING,
  AdScheduleEndTime TIMESTAMP,
  AdScheduleStartTime TIMESTAMP,
  BidAmount INT64,
  LastUpdatedByAppId STRING,
  PreviewShareableLink STRING,
  SourceAdId STRING
)
PARTITION BY DATE(_PARTITIONTIME);
