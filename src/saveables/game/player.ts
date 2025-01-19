import { Json, Log, Saveable, Utils } from "../../core";
import { DiscordUser } from "../../core/discord";
import { CardSuit, PlayerCardSource, PlayerStatus } from "../../enums";
import {
  Card,
  HandResult,
  PlayerCard,
  PlayerJson,
  TurnRecord,
} from "../../types";

export class Player implements Saveable {
  private avatarId: string | null;

  private currentBloodCards: PlayerCard[] = [];

  private currentSandCards: PlayerCard[] = [];

  private currentSpentTokenTotal: number = 0;

  private currentTokenTotal: number = 0;

  private _currentTurnRecord: TurnRecord | null = null;

  public readonly id: string;

  private globalName: string | null;

  private handResults: HandResult[] = [];

  private status: PlayerStatus = PlayerStatus.UNINITIALIZED;

  private username: string;

  public toJson(): PlayerJson {
    return {
      avatarId: this.avatarId,
      currentBloodCards: this.currentBloodCards,
      currentSandCards: this.currentSandCards,
      currentSpentTokenTotal: this.currentSpentTokenTotal,
      currentTokenTotal: this.currentTokenTotal,
      currentTurnRecord: this._currentTurnRecord,
      id: this.id,
      globalName: this.globalName,
      handResults: this.handResults,
      status: this.status,
      username: this.username,
    };
  }

  public set currentTurnRecord(value: TurnRecord | null) {
    if (value !== null && this._currentTurnRecord !== null) {
      Log.throw("Current turn record was set while already having a value.");
    }
    if (value === null && this._currentTurnRecord === null) {
      Log.error(
        "Current turn record was reset while having a null value.",
        this,
      );
    }
    this._currentTurnRecord = value;
  }

  public initialize(startingTokenTotal: number): void {
    if (this.status !== PlayerStatus.UNINITIALIZED) {
      Log.throw("Cannot initialize player. Player is not uninitialized.", this);
    }
    this.currentTokenTotal = startingTokenTotal;
    this.status = PlayerStatus.INITIALIZED;
  }

  public getCards(cardSuit?: CardSuit): PlayerCard[] {
    if (cardSuit === undefined) {
      return [...this.currentSandCards, ...this.currentBloodCards];
    }
    switch (cardSuit) {
      case CardSuit.BLOOD:
        return this.currentBloodCards;
      case CardSuit.SAND:
        return this.currentSandCards;
      default:
        Log.throw("Cannot get player cards. Unknown card suit.", { cardSuit });
    }
  }

  public removeAllCards(): Card[] {
    const playerCards: PlayerCard[] = this.getCards();
    Utils.emptyArray(this.currentBloodCards);
    Utils.emptyArray(this.currentSandCards);
    return playerCards.map(playerCard => playerCard.card);
  }

  public addCard(card: Card, cardSource: PlayerCardSource): void {
    const playerCard: PlayerCard = {
      card,
      dieRollValues: [],
      source: cardSource,
    };
    switch (playerCard.card.suit) {
      case CardSuit.BLOOD:
        this.currentBloodCards.push(playerCard);
        break;
      case CardSuit.SAND:
        this.currentSandCards.push(playerCard);
        break;
      default:
        Log.throw("Cannot add player card. Unknown card suit.", playerCard);
    }
  }

  constructor(discordUserOrJson: DiscordUser | Json) {
    if (discordUserOrJson instanceof DiscordUser) {
      this.avatarId = discordUserOrJson.avatar;
      this.id = discordUserOrJson.id;
      this.globalName = discordUserOrJson.globalName;
      this.username = discordUserOrJson.username;
    } else {
      this.avatarId = Utils.getJsonEntry(
        discordUserOrJson,
        "avatarId",
      ) as string;
      this.currentBloodCards = Utils.getJsonEntry(
        discordUserOrJson,
        "currentBloodCards",
      ) as PlayerCard[];
      this.currentSandCards = Utils.getJsonEntry(
        discordUserOrJson,
        "currentSandCards",
      ) as PlayerCard[];
      this.currentSpentTokenTotal = Utils.getJsonEntry(
        discordUserOrJson,
        "currentSpentTokenTotal",
      ) as number;
      this.currentTokenTotal = Utils.getJsonEntry(
        discordUserOrJson,
        "currentTokenTotal",
      ) as number;
      this._currentTurnRecord = Utils.getJsonEntry(
        discordUserOrJson,
        "currentTurnRecord",
      ) as TurnRecord;
      this.globalName = Utils.getJsonEntry(
        discordUserOrJson,
        "globalName",
      ) as string;
      this.handResults = Utils.getJsonEntry(
        discordUserOrJson,
        "handResults",
      ) as HandResult[];
      this.id = Utils.getJsonEntry(discordUserOrJson, "id") as string;
      this.status = Utils.getJsonEntry(
        discordUserOrJson,
        "status",
      ) as PlayerStatus;
      this.username = Utils.getJsonEntry(
        discordUserOrJson,
        "username",
      ) as string;
    }
  }
}
