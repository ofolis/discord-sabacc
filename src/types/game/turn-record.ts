import {
  PlayerCard,
} from ".";
import {
  TurnAction,
} from "../../enums";

export type TurnRecord = {
  "action": TurnAction.DRAW;
  "discardedCard": PlayerCard | null;
  "drawnCard": PlayerCard;
} | {
  "action": TurnAction.STAND;
};
