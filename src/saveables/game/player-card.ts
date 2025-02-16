import { Json, Log, Saveable, Utils } from "../../core";
import { CardType, PlayerCardSource } from "../../enums";
import { Card, PlayerCardJson } from "../../types";

export class PlayerCard implements Saveable {
  private __card: Card;

  private __source: PlayerCardSource;

  protected _dieRolls: number[] = [];

  public get card(): Card {
    return this.__card;
  }

  public get dieRolls(): readonly number[] {
    return this._dieRolls;
  }

  public constructor(card: Card, source: PlayerCardSource);

  public constructor(json: Json);

  public constructor(cardOrJson: Card | Json, source?: PlayerCardSource) {
    if ("suit" in cardOrJson) {
      const card: Card = cardOrJson as Card;
      if (source === undefined) {
        Log.throw(
          "Cannot construct player card. Constructor was missing required arguments.",
        );
      }
      this.__card = card;
      this.__source = source;
    } else {
      const json: Json = cardOrJson;
      this.__card = Utils.getJsonEntry(json, "card") as Card;
      this._dieRolls = Utils.getJsonEntry(json, "dieRolls") as number[];
      this.__source = Utils.getJsonEntry(json, "source") as PlayerCardSource;
    }
  }

  public getValue(secondaryPlayerCard?: PlayerCard): number {
    switch (this.__card.type) {
      case CardType.IMPOSTER:
        if (this._dieRolls.length !== 1) {
          Log.throw(
            "Cannot get player card value. Imposter player card does not contain exactly one die roll.",
            { card: this.__card, dieRolls: this._dieRolls },
          );
        }
        return this._dieRolls[0];
      case CardType.NUMBER:
        return this.__card.value;
      case CardType.SYLOP:
        return secondaryPlayerCard !== undefined
          ? secondaryPlayerCard.getValue()
          : 0;
      default:
        Log.throw("Cannot get player card value. Unknown card type.", {
          card: this.__card,
        });
    }
  }

  public toJson(): PlayerCardJson {
    return {
      card: this.__card,
      dieRolls: this._dieRolls,
      source: this.__source,
    };
  }
}
