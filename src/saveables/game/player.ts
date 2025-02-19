import * as discordJs from "discord.js";
import { PlayerCard, Turn } from ".";
import { Discord, Json, Log, Saveable, Utils } from "../../core";
import {
  CardSuit,
  CardType,
  DrawSource,
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
  public readonly id: string;

  private __avatarId: string | null;

  private __cards: PlayerCard[] = [];

  private __globalName: string | null;

  private __previousRoundTurns: Turn[] = [];

  private __roundTurn: Turn | null = null;

  private __spentTokenTotal: number = 0;

  private __status: PlayerStatus = PlayerStatus.UNINITIALIZED;

  private __tokenTotal: number = 0;

  private __username: string;

  public constructor(userOrJson: discordJs.User | Json) {
    if (userOrJson instanceof discordJs.User) {
      const user: discordJs.User = userOrJson;
      this.__avatarId = user.avatar;
      this.__globalName = user.globalName;
      this.__username = user.username;
      this.id = user.id;
    } else {
      const json: Json = userOrJson;
      this.__avatarId = Utils.getJsonEntry(json, "avatarId") as string;
      this.__cards = (
        Utils.getJsonEntry(json, "cards") as PlayerCardJson[]
      ).map(playerCardJson => new PlayerCard(playerCardJson));
      this.__globalName = Utils.getJsonEntry(json, "globalName") as string;
      const previousRoundTurnsJson: TurnJson[] = Utils.getJsonEntry(
        json,
        "previousRoundTurns",
      ) as TurnJson[];
      this.__previousRoundTurns = previousRoundTurnsJson.map(
        turnJson => new Turn(turnJson),
      );
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
      this.__username = Utils.getJsonEntry(json, "username") as string;
      this.id = Utils.getJsonEntry(json, "id") as string;
    }
  }

  public get availableTokenTotal(): number {
    return this.__tokenTotal - this.__spentTokenTotal;
  }

  public get avatarUrl(): string | null {
    return Discord.formatAvatarUrl({ avatar: this.__avatarId, id: this.id });
  }

  public get nameString(): string {
    // TODO: Enhance to use server nickname if available
    return Discord.formatUserNameString({
      globalName: this.__globalName,
      username: this.__username,
    });
  }

  public get roundTurn(): Turn | null {
    return this.__roundTurn;
  }

  public get spentTokenTotal(): number {
    return this.__spentTokenTotal;
  }

  public get status(): PlayerStatus {
    return this.__status;
  }

  public get tagString(): string {
    return Discord.formatUserMentionString({ id: this.id });
  }

  public get tokenTotal(): number {
    return this.__tokenTotal;
  }

  private static __comparePlayerCards(a: PlayerCard, b: PlayerCard): number {
    // Sort by suit first (SAND before BLOOD)
    if (a.card.suit !== b.card.suit) {
      return a.card.suit === CardSuit.SAND ? -1 : 1;
    }
    // Sort by type: SYLOP first, then IMPOSTER, then NUMBER
    const typeOrder: Record<CardType, number> = {
      [CardType.SYLOP]: 0,
      [CardType.IMPOSTER]: 1,
      [CardType.NUMBER]: 2,
    };
    if (typeOrder[a.card.type] !== typeOrder[b.card.type]) {
      return typeOrder[a.card.type] - typeOrder[b.card.type];
    }
    // Sort NUMBER cards by value (lowest first)
    if (a.card.type === CardType.NUMBER && b.card.type === CardType.NUMBER) {
      return a.card.value - b.card.value;
    }
    return 0;
  }

  public discardRoundTurn(): void {
    if (this.__roundTurn === null) {
      Log.throw(
        "Cannot discard round turn. Player does not have a round turn defined.",
      );
    }
    if (this.__roundTurn.isResolved) {
      Log.throw("Cannot discard round turn. Round turn has been resolved.", {
        roundTurn: this.__roundTurn,
      });
    }
    this.__roundTurn = null;
  }

  public getCards(cardSuit?: CardSuit): readonly PlayerCard[] {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot get cards. Player is not currently active.", {
        status: this.__status,
      });
    }
    this.__cards.sort((a, b) => Player.__comparePlayerCards(a, b));
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
      globalName: this.__globalName,
      id: this.id,
      previousRoundTurns: this.__previousRoundTurns.map(turn => turn.toJson()),
      roundTurn: this.__roundTurn !== null ? this.__roundTurn.toJson() : null,
      spentTokenTotal: this.__spentTokenTotal,
      status: this.__status,
      tokenTotal: this.__tokenTotal,
      username: this.__username,
    };
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

  protected _archiveRoundTurn(): void {
    if (this.__roundTurn === null) {
      Log.throw(
        "Cannot archive round turn. Player does not have a round turn defined.",
      );
    }
    if (!this.__roundTurn.isResolved) {
      Log.throw(
        "Cannot archive round turn. Round turn has not been resolved.",
        {
          roundTurn: this.__roundTurn,
        },
      );
    }
    this.__previousRoundTurns.push(this.__roundTurn);
    this.__roundTurn = null;
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

  protected _discardCard(card: PlayerCard): void {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot discard card. Player is not currently active.", {
        status: this.__status,
      });
    }
    if (this.__roundTurn === null) {
      Log.throw(
        "Cannot discard card. Player does not have a round turn defined.",
      );
    }
    const cardIndex: number = this.__cards.indexOf(card);
    if (cardIndex === -1) {
      Log.throw(
        "Cannot discard card. Player does not have the specified card.",
        {
          card,
          cards: this.__cards,
        },
      );
    }
    this.__cards.splice(cardIndex, 1);
    this.__roundTurn["_setDiscardedCard"](card.card);
  }

  protected _drawCard(card: Card, drawSource: DrawSource): void {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot draw card. Player is not currently active.", {
        status: this.__status,
      });
    }
    if (this.__roundTurn === null) {
      Log.throw("Cannot draw card. Player does not have a round turn defined.");
    }
    const playerCardSource: PlayerCardSource =
      drawSource === DrawSource.DECK
        ? PlayerCardSource.DECK_DRAW
        : PlayerCardSource.DISCARD_DRAW;
    this._addCard(card, playerCardSource);
    this.__roundTurn["_setDrawnCard"](card, drawSource);
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
      tokenTotal: this.__tokenTotal,
    };
    return playerScorable;
  }

  protected _hasPlayerCard(playerCard: PlayerCard): boolean {
    if (this.__cards.indexOf(playerCard) !== -1) {
      return true;
    }
    return false;
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

  protected _resetTokens(): void {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot reset tokens. Player is not currently active.", {
        status: this.__status,
      });
    }
    this.__spentTokenTotal = 0;
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

  protected _spendToken(): void {
    if (this.__status !== PlayerStatus.ACTIVE) {
      Log.throw("Cannot spend token. Player is not currently active.", {
        status: this.__status,
      });
    }
    if (this.__roundTurn === null) {
      Log.throw(
        "Cannot spend token. Player does not have a round turn defined.",
      );
    }
    if (this.availableTokenTotal === 0) {
      Log.throw("Cannot spend token. Player has no remaining tokens.");
    }
    this.__spentTokenTotal++;
    this.__roundTurn["_addSpentTokens"](1);
  }
}
