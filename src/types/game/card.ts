import { CardSuit, CardType } from "../../enums";

export type Card = {
  readonly suit: CardSuit;
  readonly type: CardType;
  readonly value: number;
};
