import {
  PlayerCard,
} from ".";
import {
  TurnAction,
  TurnStatus,
} from "../../enums";

export type TurnRecord = {
  "action": TurnAction.DRAW;
  "discardedCard": PlayerCard | null;
  "drawnCard": PlayerCard | null;
  "status": TurnStatus;
} | {
  "action": TurnAction.STAND;
  "status": TurnStatus;
};
