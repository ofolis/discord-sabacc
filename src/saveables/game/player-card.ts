import { Json, Log, Saveable, Utils } from "../../core";
import { CardType, PlayerCardSource } from "../../enums";
import { Card, PlayerCardJson } from "../../types";

export class PlayerCard implements Saveable {
  private __card: Card;

  private __dieRollValues: number[] = [];

  private __source: PlayerCardSource;

  public get card(): Card {
    return this.__card;
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
      this.__dieRollValues = Utils.getJsonEntry(
        json,
        "dieRollValues",
      ) as number[];
      this.__source = Utils.getJsonEntry(json, "source") as PlayerCardSource;
    }
  }

  public getValue(secondaryPlayerCard?: PlayerCard): number {
    switch (this.__card.type) {
      case CardType.IMPOSTER:
        if (this.__dieRollValues.length !== 1) {
          Log.throw(
            "Cannot get player card value. Imposter player card does not contain exactly one die roll value.",
            { card: this.__card, dieRollValues: this.__dieRollValues },
          );
        }
        return this.__dieRollValues[0];
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
      dieRollValues: this.__dieRollValues,
      source: this.__source,
    };
  }
}
