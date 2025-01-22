import { Player } from ".";
import { Json, Log, Saveable, Utils } from "../../core";
import { CardSuit, CardType, PlayerCardSource } from "../../enums";
import { Card, PlayerCardJson } from "../../types";

export class PlayerCard implements Saveable {
  private card: Card;

  private dieRollValues: number[] = [];

  private player: Player;

  private source: PlayerCardSource;

  constructor(player: Player, card: Card, source: PlayerCardSource);

  constructor(player: Player, json: Json);

  constructor(
    player: Player,
    cardOrJson: Card | Json,
    source?: PlayerCardSource,
  ) {
    this.player = player;
    if ("suit" in cardOrJson) {
      const card: Card = cardOrJson as Card;
      if (source === undefined) {
        Log.throw(
          "Cannot construct player card. Constructor was missing required arguments.",
          this,
        );
      }
      this.card = card;
      this.source = source;
    } else {
      const json: Json = cardOrJson;
      this.card = Utils.getJsonEntry(json, "card") as Card;
      this.dieRollValues = Utils.getJsonEntry(
        json,
        "dieRollValues",
      ) as number[];
      this.source = Utils.getJsonEntry(json, "source") as PlayerCardSource;
    }
  }

  public get suit(): CardSuit {
    return this.card.suit;
  }

  public get type(): CardType {
    return this.card.type;
  }

  public getValue(secondaryPlayerCard?: PlayerCard): number {
    switch (this.card.type) {
      case CardType.IMPOSTER:
        if (this.dieRollValues.length !== 1) {
          Log.throw(
            "Cannot get final card value. Imposter player card does not contain exactly one die roll value.",
            this,
          );
        }
        return this.dieRollValues[0];
      case CardType.NUMBER:
        return this.card.value;
      case CardType.SYLOP:
        return secondaryPlayerCard !== undefined
          ? secondaryPlayerCard.getValue()
          : 0;
      default:
        Log.throw(
          "Cannot get final card value. Unknown player card type.",
          this,
        );
    }
  }

  public toCard(): Card {
    this.player.removeCard(this);
    return this.card;
  }

  public toJson(): PlayerCardJson {
    return {
      card: this.card,
      dieRollValues: this.dieRollValues,
      source: this.source,
    };
  }
}
