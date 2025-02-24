import { Json, Log, Saveable, Utils } from "../../core";
import { DrawSource, TurnAction } from "../../enums";
import { Card, TurnJson } from "../../types";

export class Turn implements Saveable {
  public readonly action: TurnAction;

  private __discardedCard: Card | null = null;

  private __drawnCard: Card | null = null;

  private __drawnCardSource: DrawSource | null = null;

  private __isResolved: boolean = false;

  private __spentTokens: number = 0;

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

  public get drawnCardSource(): DrawSource | null {
    return this.__drawnCardSource;
  }

  public get isResolved(): boolean {
    return this.__isResolved;
  }

  public get spentTokens(): number {
    return this.__spentTokens;
  }

  public toJson(): TurnJson {
    return {
      action: this.action,
      discardedCard: this.__discardedCard,
      drawnCard: this.__drawnCard,
      isResolved: this.__isResolved,
    };
  }

  protected _addSpentTokens(tokens: number): void {
    this.__spentTokens += tokens;
  }

  protected _resolve(): void {
    if (this.__isResolved) {
      Log.throw("Cannot resolve turn. Turn is already resolved.");
    }
    if (
      this.action === TurnAction.DRAW &&
      (this.__discardedCard === null || this.__drawnCard === null)
    ) {
      Log.throw(
        "Cannot resolve turn. Draw action does not have a drawn and discarded card set.",
        {
          discardedCard: this.__discardedCard,
          drawnCard: this.__drawnCard,
        },
      );
    }
    this.__isResolved = true;
  }

  protected _setDiscardedCard(card: Card): void {
    if (this.action !== TurnAction.DRAW) {
      Log.throw("Cannot set discarded card. Turn action is not draw.", {
        action: this.action,
      });
    }
    if (this.__discardedCard !== null) {
      Log.throw("Cannot set discarded card. Discarded card is already set.", {
        discardedCard: this.__discardedCard,
      });
    }
    if (this.drawnCard === null) {
      Log.throw("Cannot set discarded card. Drawn card is not set.");
    }
    this.__discardedCard = card;
  }

  protected _setDrawnCard(card: Card, source: DrawSource): void {
    if (this.action !== TurnAction.DRAW) {
      Log.throw("Cannot set drawn card. Turn action is not draw.", {
        action: this.action,
      });
    }
    if (this.__drawnCard !== null) {
      Log.throw("Cannot set drawn card. Drawn card is already set.", {
        drawnCard: this.__drawnCard,
      });
    }
    this.__drawnCard = card;
    this.__drawnCardSource = source;
  }
}
