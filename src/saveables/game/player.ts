import * as discordJs from "discord.js";
import { PlayerCard, Turn } from ".";
import { Json, Log, Saveable, Utils } from "../../core";
import {
  CardSuit,
  PlayerCardSource,
  PlayerStatus,
  TurnAction,
} from "../../enums";
import {
  Card,
  PlayerCardJson,
  PlayerJson,
  PlayerScoreable,
  TurnJson,
} from "../../types";
export class Player implements Saveable {
  private __avatarId: string | null;

  private __cards: PlayerCard[] = [];

  private __roundTurn: Turn | null = null;

  private __spentTokenTotal: number = 0;

  private __status: PlayerStatus = PlayerStatus.UNINITIALIZED;

  private __tokenTotal: number = 0;

  public readonly globalName: string | null;

  public readonly id: string;

  public readonly username: string;

  public get cardTotal(): number {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot get card total. Player is not currently active.", {
        status: this.__status,
      });
    }
    return this.__cards.length;
  }

  public get currentTokenTotal(): number {
    return this.__tokenTotal - this.__spentTokenTotal;
  }

  public get roundTurn(): Turn | null {
    return this.__roundTurn;
  }

  public constructor(userOrJson: discordJs.User | Json) {
    if (userOrJson instanceof discordJs.User) {
      const user: discordJs.User = userOrJson;
      this.__avatarId = user.avatar;
      this.globalName = user.globalName;
      this.id = user.id;
      this.username = user.username;
    } else {
      const json: Json = userOrJson;
      this.__avatarId = Utils.getJsonEntry(json, "avatarId") as string;
      this.__cards = (
        Utils.getJsonEntry(json, "cards") as PlayerCardJson[]
      ).map(playerCardJson => new PlayerCard(playerCardJson));
      const roundTurnJson: TurnJson | null = Utils.getJsonEntry(
        json,
        "roundTurn",
      ) as TurnJson | null;
      this.__roundTurn =
        roundTurnJson !== null ? new Turn(roundTurnJson) : null;
      this.__spentTokenTotal = Utils.getJsonEntry(
        json,
        "spentTokenTotal",
      ) as number;
      this.__status = Utils.getJsonEntry(json, "status") as PlayerStatus;
      this.__tokenTotal = Utils.getJsonEntry(json, "tokenTotal") as number;
      this.globalName = Utils.getJsonEntry(json, "globalName") as string;
      this.id = Utils.getJsonEntry(json, "id") as string;
      this.username = Utils.getJsonEntry(json, "username") as string;
    }
  }

  protected _addCard(card: Card, playerCardSource: PlayerCardSource): void {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot add card. Player is not currently active.", {
        status: this.__status,
      });
    }
    const playerCard: PlayerCard = new PlayerCard(card, playerCardSource);
    this.__cards.push(playerCard);
  }

  protected _createRoundTurn(turnAction: TurnAction): Turn {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot create turn. Player is not currently active.", {
        status: this.__status,
      });
    }
    if (this.roundTurn !== null) {
      Log.throw("Cannot create turn. Player already has a round turn defined.");
    }
    this.__roundTurn = new Turn(turnAction);
    return this.__roundTurn;
  }

  protected _deductTokens(tokenLossTotal: number): void {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot deduct tokens. Player is not currently active.", {
        status: this.__status,
      });
    }
    this.__tokenTotal = Math.max(this.__tokenTotal - tokenLossTotal, 0);
    this.__spentTokenTotal = Math.min(
      this.__spentTokenTotal,
      this.__tokenTotal,
    );
    if (this.__tokenTotal === 0) {
      this.__status = PlayerStatus.ELIMINATED;
    }
  }

  protected _getScorable(): PlayerScoreable {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot get hand result. Player is not currently active.", {
        status: this.__status,
      });
    }
    const bloodCards: readonly PlayerCard[] = this.getCards(CardSuit.BLOOD);
    const sandCards: readonly PlayerCard[] = this.getCards(CardSuit.SAND);
    if (bloodCards.length > 1 || sandCards.length > 1) {
      Log.throw(
        "Cannot get hand result. Player does not contain exactly one card of each suit.",
        {
          bloodCards,
          sandCards,
        },
      );
    }
    const bloodCardValue: number = bloodCards[0].getValue(sandCards[0]);
    const sandCardValue: number = sandCards[0].getValue(bloodCards[0]);
    const playerScorable: PlayerScoreable = {
      bloodCard: bloodCards[0].card,
      bloodCardValue: bloodCardValue,
      cardDifference: Math.abs(bloodCardValue - sandCardValue),
      lowestCardValue: Math.min(bloodCardValue, sandCardValue),
      playerId: this.id,
      sandCard: sandCards[0].card,
      sandCardValue: sandCardValue,
      spentTokenTotal: this.__spentTokenTotal,
    };
    return playerScorable;
  }

  protected _removeAllCards(): Card[] {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot remove all cards. Player is not currently active.", {
        status: this.__status,
      });
    }
    const cards: Card[] = this.__cards.map(playerCard => playerCard.card);
    Utils.emptyArray(this.__cards);
    return cards;
  }

  protected _removeCard(playerCard: PlayerCard): Card {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot remove card. Player is not currently active.", {
        status: this.__status,
      });
    }
    const playerCardIndex: number = this.__cards.indexOf(playerCard);
    if (playerCardIndex === -1) {
      Log.throw(
        "Cannot remove card. Player does not have the specified card.",
        {
          card: playerCard,
          cards: this.__cards,
        },
      );
    }
    const card: Card = playerCard.card;
    this.__cards.splice(playerCardIndex, 1);
    return card;
  }

  protected _resolveRoundTurn(): void {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot resolve turn. Player is not currently active.", {
        status: this.__status,
      });
    }
    if (this.__roundTurn === null) {
      Log.throw(
        "Cannot resolve turn. Player does not have a round turn defined.",
      );
    }
    this.__roundTurn["_resolve"]();
  }

  protected _initialize(tokenTotal: number): void {
    if (this.__status !== PlayerStatus.UNINITIALIZED) {
      Log.throw(
        "Cannot initialize player. Player is not currently uninitialized.",
        { status: this.__status },
      );
    }
    this.__tokenTotal = tokenTotal;
    this.__status = PlayerStatus.ACTIVE;
  }

  public getCards(cardSuit?: CardSuit): readonly PlayerCard[] {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot get cards. Player is not currently active.", {
        status: this.__status,
      });
    }
    if (cardSuit === undefined) {
      return this.__cards;
    } else {
      return this.__cards.filter(
        playerCard => playerCard.card.suit === cardSuit,
      );
    }
  }

  public toJson(): PlayerJson {
    return {
      avatarId: this.__avatarId,
      cards: this.__cards.map(playerCard => playerCard.toJson()),
      id: this.id,
      globalName: this.globalName,
      roundTurn: this.__roundTurn !== null ? this.__roundTurn.toJson() : null,
      spentTokenTotal: this.__spentTokenTotal,
      status: this.__status,
      tokenTotal: this.__tokenTotal,
      username: this.username,
    };
  }
}
