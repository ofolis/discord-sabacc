import {
  CardSuit,
  DrawSource,
} from "../../enums";

export type PendingDiscard = {
  "cardSuit": CardSuit;
  "drawSource": DrawSource;
};
