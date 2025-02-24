import { RankedPlayerScorable } from ".";

export type HandResultJson = {
  readonly rankings: RankedPlayerScorable[];
  readonly remainingPlayerIds: string[] | null;
};
