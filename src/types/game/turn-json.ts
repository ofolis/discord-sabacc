import { Card } from ".";
import { TurnAction } from "../../enums";

export type TurnJson = {
  action: TurnAction | null;
  discardedCard: Card | null;
  drawnCard: Card | null;
  isResolved: boolean;
};
