import { PlayerScoreable } from ".";

export type RankedPlayerScorable = PlayerScoreable & {
  readonly rankIndex: number;
  readonly tokenLossTotal: number;
  readonly tokenPenaltyTotal: number;
};
