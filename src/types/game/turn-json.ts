import { Card } from ".";
import { DrawSource, TurnAction } from "../../enums";

export type TurnJson = {
  readonly action: TurnAction | null;
  readonly discardedCard: Card | null;
  readonly drawnCard: Card | null;
  readonly drawnCardSource: DrawSource | null;
  readonly isResolved: boolean;
  readonly spentTokens: number;
};
