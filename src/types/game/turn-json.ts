import { Card } from ".";
import { TurnAction } from "../../enums";

export type TurnJson = {
  readonly action: TurnAction | null;
  readonly discardedCard: Card | null;
  readonly drawnCard: Card | null;
  readonly isResolved: boolean;
};
