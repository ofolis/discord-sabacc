import { Json, Log, Saveable, Utils } from "../../core";
import { PlayerCardSource } from "../../enums";
import { Card, PlayerCardJson } from "../../types";

export class PlayerCard implements Saveable {
  private __card: Card;

  private __dieRollValues: number[] = [];

  private __source: PlayerCardSource;

  constructor(card: Card, source: PlayerCardSource);

  constructor(json: Json);

  constructor(cardOrJson: Card | Json, source?: PlayerCardSource) {
    if ("suit" in cardOrJson) {
      const card: Card = cardOrJson as Card;
      if (source === undefined) {
        Log.throw(
          "Cannot construct player card. Constructor was missing required arguments.",
          this,
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

  public toJson(): PlayerCardJson {
    return {
      card: this.__card,
      dieRollValues: this.__dieRollValues,
      source: this.__source,
    };
  }
}
