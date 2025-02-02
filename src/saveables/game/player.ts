import { User } from "discord.js";
import { PlayerCard, Turn } from ".";
import { Json, Log, Saveable, Utils } from "../../core";
import { CardSuit, PlayerCardSource, PlayerStatus } from "../../enums";
import {
  Card,
  HandResult,
  PlayerCardJson,
  PlayerJson,
  TurnJson,
} from "../../types";
export class Player implements Saveable {
  private __avatarId: string | null;

  private __cards: PlayerCard[] = [];

  private __currentTurn: Turn | null = null;

  private __globalName: string | null;

  private __handResults: HandResult[] = [];

  private __id: string;

  private __spentTokenTotal: number = 0;

  private __status: PlayerStatus = PlayerStatus.UNINITIALIZED;

  private __tokenTotal: number = 0;

  private __username: string;

  public get cardTotal(): number {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot get card total. Player is not currently active.", this);
    }
    return this.__cards.length;
  }

  constructor(userOrJson: User | Json) {
    if (userOrJson instanceof User) {
      const user: User = userOrJson;
      this.__avatarId = user.avatar;
      this.__globalName = user.globalName;
      this.__id = user.id;
      this.__username = user.username;
    } else {
      const json: Json = userOrJson;
      this.__avatarId = Utils.getJsonEntry(json, "avatarId") as string;
      this.__cards = (
        Utils.getJsonEntry(json, "cards") as PlayerCardJson[]
      ).map(playerCardJson => new PlayerCard(playerCardJson));
      const currentTurnJson: TurnJson | null = Utils.getJsonEntry(
        json,
        "currentTurn",
      ) as TurnJson | null;
      this.__currentTurn =
        currentTurnJson !== null ? new Turn(currentTurnJson) : null;
      this.__globalName = Utils.getJsonEntry(json, "globalName") as string;
      this.__handResults = Utils.getJsonEntry(
        json,
        "handResults",
      ) as HandResult[];
      this.__id = Utils.getJsonEntry(json, "id") as string;
      this.__spentTokenTotal = Utils.getJsonEntry(
        json,
        "spentTokenTotal",
      ) as number;
      this.__status = Utils.getJsonEntry(json, "status") as PlayerStatus;
      this.__tokenTotal = Utils.getJsonEntry(json, "tokenTotal") as number;
      this.__username = Utils.getJsonEntry(json, "username") as string;
    }
  }

  public addCard(card: Card, playerCardSource: PlayerCardSource): void {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot add cards. Player is not currently active.", this);
    }
    const playerCard: PlayerCard = new PlayerCard(card, playerCardSource);
    this.__cards.push(playerCard);
  }

  public getCards(cardSuit?: CardSuit): PlayerCard[] {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot get cards. Player is not currently active.", this);
    }
    if (cardSuit === undefined) {
      return [...this.__cards]; // Shallow copy
    } else {
      return this.__cards.filter(
        playerCard => playerCard.card.suit === cardSuit,
      );
    }
  }

  public removeAllCards(): Card[] {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw(
        "Cannot remove all cards. Player is not currently active.",
        this,
      );
    }
    const cards: Card[] = this.__cards.map(playerCard => playerCard.card);
    Utils.emptyArray(this.__cards);
    return cards;
  }

  public initialize(tokenTotal: number): void {
    if (this.__status !== PlayerStatus.UNINITIALIZED) {
      Log.throw(
        "Cannot initialize player. Player is not currently uninitialized.",
        this,
      );
    }
    this.__tokenTotal = tokenTotal;
    this.__status = PlayerStatus.ACTIVE;
  }

  public toJson(): PlayerJson {
    return {
      avatarId: this.__avatarId,
      cards: this.__cards.map(playerCard => playerCard.toJson()),
      currentTurn:
        this.__currentTurn !== null ? this.__currentTurn.toJson() : null,
      id: this.__id,
      globalName: this.__globalName,
      handResults: this.__handResults,
      spentTokenTotal: this.__spentTokenTotal,
      status: this.__status,
      tokenTotal: this.__tokenTotal,
      username: this.__username,
    };
  }
}
