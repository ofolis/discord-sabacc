import { Json, Log, Saveable, Utils } from "../../core";
import { TurnAction } from "../../enums";
import { Card, TurnJson } from "../../types";

export class Turn implements Saveable {
  private _action: TurnAction | null = null;

  private _isResolved: boolean = false;

  private discardedCard: Card | null = null;

  private drawnCard: Card | null = null;

  constructor(json?: Json) {
    if (json !== undefined) {
      this._action = Utils.getJsonEntry(json, "action") as TurnAction;
      this.discardedCard = Utils.getJsonEntry(json, "discardedCard") as Card;
      this.drawnCard = Utils.getJsonEntry(json, "drawnCard") as Card;
      this._isResolved = Utils.getJsonEntry(json, "isResolved") as boolean;
    }
  }

  public get action(): TurnAction | null {
    return this._action;
  }

  public get isResolved(): boolean {
    return this._isResolved;
  }

  private validateAction(isSet: boolean): void {
    if (isSet && this._action === null) {
      Log.throw("Action has not been set.", this);
    }
    if (!isSet && this._action !== null) {
      Log.throw("Action has already been set.", this);
    }
  }

  private validateDiscardedCard(isSet: boolean): void {
    if (isSet && this.discardedCard === null) {
      Log.throw("Discarded card has not been set.", this);
    }
    if (!isSet && this.discardedCard !== null) {
      Log.throw("Discarded card has already been set.", this);
    }
  }

  private validateDrawnCard(isSet: boolean): void {
    if (isSet && this.drawnCard === null) {
      Log.throw("Drawn card has not been set.", this);
    }
    if (!isSet && this.drawnCard !== null) {
      Log.throw("Drawn card has already been set.", this);
    }
  }

  private validateUnresolved(): void {
    if (this._isResolved) {
      Log.throw("Turn is resolved.", this);
    }
  }

  public resolve(): void {
    this.validateUnresolved();
    this.validateAction(true);
    if (this._action === TurnAction.DRAW) {
      this.validateDiscardedCard(true);
      this.validateDrawnCard(true);
    }
    this._isResolved = true;
  }

  public setAction(action: TurnAction): void {
    this.validateUnresolved();
    this.validateAction(false);
    this._action = action;
  }

  public setDiscardedCard(card: Card): void {
    this.validateUnresolved();
    if (this.action !== TurnAction.DRAW) {
      Log.throw("Cannot set discarded card. Turn action is not draw.", this);
    }
    this.validateDrawnCard(true);
    this.validateDiscardedCard(false);
    this.discardedCard = card;
  }

  public setDrawnCard(card: Card): void {
    this.validateUnresolved();
    if (this.action !== TurnAction.DRAW) {
      Log.throw("Cannot set discarded card. Turn action is not draw.", this);
    }
    this.validateDrawnCard(false);
    this.validateDiscardedCard(false);
    this.drawnCard = card;
  }

  public unsetAction(): void {
    this.validateUnresolved();
    this.validateAction(true);
    this._action = null;
  }

  public toJson(): TurnJson {
    return {
      action: this._action,
      discardedCard: this.discardedCard,
      drawnCard: this.drawnCard,
      isResolved: this._isResolved,
    };
  }
}
