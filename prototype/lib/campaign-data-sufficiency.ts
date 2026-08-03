export type CampaignDataSufficiency =
  | "SUFFICIENT_DATA"
  | "INSUFFICIENT_DATA";

export function checkCampaignDataSufficiency(
  spend: number,
  sessions: number,
): CampaignDataSufficiency {
  return spend >= 150 || sessions >= 150
    ? "SUFFICIENT_DATA"
    : "INSUFFICIENT_DATA";
}
