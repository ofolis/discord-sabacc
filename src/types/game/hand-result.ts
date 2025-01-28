import { PlayerCardJson } from ".";

export type HandResult = {
  bloodCard: PlayerCardJson;
  bloodCardValue: number;
  cardDifference: number;
  lowestCardValue: number;
  playerId: string;
  rankIndex: number;
  sandCard: PlayerCardJson;
  sandCardValue: number;
  tokenLossTotal: number;
  tokenPenaltyTotal: number;
  spentTokenTotal: number;
};
