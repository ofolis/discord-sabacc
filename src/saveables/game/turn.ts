import { Json, Log, Saveable, Utils } from "../../core";
import { TurnAction } from "../../enums";
import { Card, TurnJson } from "../../types";

export class Turn implements Saveable {
  public readonly action: TurnAction;

  private __discardedCard: Card | null = null;

  private __drawnCard: Card | null = null;

  private __isResolved: boolean = false;

  public constructor(turnActionOrjson: TurnAction | Json) {
    if (typeof turnActionOrjson !== "object") {
      const turnAction: TurnAction = turnActionOrjson;
      this.action = turnAction;
    } else {
      const json: Json = turnActionOrjson;
      this.__discardedCard = Utils.getJsonEntry(json, "discardedCard") as Card;
      this.__drawnCard = Utils.getJsonEntry(json, "drawnCard") as Card;
      this.__isResolved = Utils.getJsonEntry(json, "isResolved") as boolean;
      this.action = Utils.getJsonEntry(json, "action") as TurnAction;
    }
  }

  public get discardedCard(): Card | null {
    return this.__discardedCard;
  }

  public get drawnCard(): Card | null {
    return this.__drawnCard;
  }

  public get isResolved(): boolean {
    return this.__isResolved;
  }

  public toJson(): TurnJson {
    return {
      action: this.action,
      discardedCard: this.__discardedCard,
      drawnCard: this.__drawnCard,
      isResolved: this.__isResolved,
    };
  }

  protected _resolve(): void {
    if (this.__isResolved) {
      Log.throw("Cannot resolve turn. Turn is already resolved.");
    }
    this.__isResolved = true;
  }
}
