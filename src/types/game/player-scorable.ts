import { Card } from ".";

export type PlayerScoreable = {
  readonly bloodCard: Card;
  readonly bloodCardValue: number;
  readonly cardDifference: number;
  readonly lowestCardValue: number;
  readonly playerId: string;
  readonly sandCard: Card;
  readonly sandCardValue: number;
  readonly spentTokenTotal: number;
  readonly tokenTotal: number;
};
