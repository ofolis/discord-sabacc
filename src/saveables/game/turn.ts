import { Json, Saveable, Utils } from "../../core";
import { TurnAction } from "../../enums";
import { Card, TurnJson } from "../../types";

export class Turn implements Saveable {
  private __action: TurnAction | null = null;

  private __isResolved: boolean = false;

  private __discardedCard: Card | null = null;

  private __drawnCard: Card | null = null;

  constructor(json?: Json) {
    if (json !== undefined) {
      this.__action = Utils.getJsonEntry(json, "action") as TurnAction;
      this.__discardedCard = Utils.getJsonEntry(json, "discardedCard") as Card;
      this.__drawnCard = Utils.getJsonEntry(json, "drawnCard") as Card;
      this.__isResolved = Utils.getJsonEntry(json, "isResolved") as boolean;
    }
  }

  public toJson(): TurnJson {
    return {
      action: this.__action,
      discardedCard: this.__discardedCard,
      drawnCard: this.__drawnCard,
      isResolved: this.__isResolved,
    };
  }
}
