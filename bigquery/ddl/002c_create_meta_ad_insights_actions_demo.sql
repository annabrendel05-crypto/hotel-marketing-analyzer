-- AdInsightsActions_demo
CREATE TABLE `hotel-marketing-analyzer-demo.meta_ads.AdInsightsActions_demo`
(
  Target STRING,
  DatePreset STRING,
  DateStart DATE,
  DateEnd DATE,
  TimeIncrement STRING,
  Level STRING,
  ActionAttributionWindows STRING,
  ActionCollection STRING,
  AdAccountId STRING,
  AdAccountName STRING,
  CampaignId STRING,
  CampaignName STRING,
  AdSetId STRING,
  AdSetName STRING,
  AdId STRING,
  AdName STRING,
  ActionValue FLOAT64,
  Action1dClick STRING,
  Action1dView STRING,
  Action7dClick STRING,
  Action7dView STRING,
  Action28dClick STRING,
  Action28dView STRING,
  ActionDDA STRING,
  AdEffectiveStatus STRING,
  UseAsync BOOL,
  ActionType STRING
)
PARTITION BY DATE(_PARTITIONTIME);
