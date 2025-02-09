import { Json, Saveable, Utils } from "../../core";
import { TurnAction } from "../../enums";
import { Card, TurnJson } from "../../types";

export class Turn implements Saveable {
  private __action: TurnAction;

  private __isResolved: boolean = false;

  private __discardedCard: Card | null = null;

  private __drawnCard: Card | null = null;

  public constructor(turnActionOrjson: TurnAction | Json) {
    if (typeof turnActionOrjson !== "object") {
      const turnAction: TurnAction = turnActionOrjson;
      this.__action = turnAction;
    } else {
      const json: Json = turnActionOrjson;
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
