import { CardSuit, CardType } from "../../enums";
import { Card } from "../../types";

export const DECK: (suit: CardSuit) => Card[] = (suit: CardSuit): Card[] => [
  { suit, type: CardType.SYLOP, value: 0 },
  { suit, type: CardType.IMPOSTER, value: 0 },
  { suit, type: CardType.IMPOSTER, value: 0 },
  { suit, type: CardType.IMPOSTER, value: 0 },
  { suit, type: CardType.NUMBER, value: 1 },
  { suit, type: CardType.NUMBER, value: 1 },
  { suit, type: CardType.NUMBER, value: 1 },
  { suit, type: CardType.NUMBER, value: 2 },
  { suit, type: CardType.NUMBER, value: 2 },
  { suit, type: CardType.NUMBER, value: 2 },
  { suit, type: CardType.NUMBER, value: 3 },
  { suit, type: CardType.NUMBER, value: 3 },
  { suit, type: CardType.NUMBER, value: 3 },
  { suit, type: CardType.NUMBER, value: 4 },
  { suit, type: CardType.NUMBER, value: 4 },
  { suit, type: CardType.NUMBER, value: 4 },
  { suit, type: CardType.NUMBER, value: 5 },
  { suit, type: CardType.NUMBER, value: 5 },
  { suit, type: CardType.NUMBER, value: 5 },
  { suit, type: CardType.NUMBER, value: 6 },
  { suit, type: CardType.NUMBER, value: 6 },
  { suit, type: CardType.NUMBER, value: 6 },
];
