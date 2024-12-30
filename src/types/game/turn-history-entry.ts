import {
  Card,
} from ".";
import {
  DrawSource,
  TurnAction,
} from "../../enums";

export type TurnHistoryEntry = {
  "discardedCard": Card;
  "drawSource": DrawSource;
  "turnAction": TurnAction.DRAW;
} | {
  "turnAction": TurnAction.STAND;
};
