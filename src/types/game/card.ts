import {
  CardSuit,
  CardType,
} from "../../enums";

export type Card = {
  "suit": CardSuit,
  "type": CardType,
  "value": number,
};
