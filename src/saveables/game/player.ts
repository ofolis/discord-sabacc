import { PlayerCard, Session, Turn } from ".";
import { GameController } from "../../controllers";
import { Json, Log, Saveable, Utils } from "../../core";
import { DiscordUser } from "../../core/discord";
import { CardSuit, PlayerCardSource, PlayerStatus } from "../../enums";
import {
  Card,
  HandResult,
  PlayerCardJson,
  PlayerJson,
  TurnJson,
} from "../../types";

// TODO: Keep refining as needed; keep everything possible private, then consolidate and simplify once all errors are gone
export class Player implements Saveable {
  private _currentSpentTokenTotal: number = 0;

  private _currentTokenTotal: number = 0;

  private _currentTurn: Turn | null = null;

  private avatarId: string | null;

  private currentPlayerCards: PlayerCard[] = [];

  private globalName: string | null;

  private handResults: HandResult[] = [];

  private session: Session;

  private status: PlayerStatus = PlayerStatus.UNINITIALIZED;

  private username: string;

  public readonly id: string;

  constructor(session: Session, discordUserOrJson: DiscordUser | Json) {
    this.session = session;
    if (discordUserOrJson instanceof DiscordUser) {
      const discordUser: DiscordUser = discordUserOrJson;
      this.avatarId = discordUser.avatar;
      this.id = discordUser.id;
      this.globalName = discordUser.globalName;
      this.username = discordUser.username;
    } else {
      const json: Json = discordUserOrJson;
      this.avatarId = Utils.getJsonEntry(json, "avatarId") as string;
      this.currentPlayerCards = (
        Utils.getJsonEntry(json, "currentCards") as PlayerCardJson[]
      ).map(playerCardJson => new PlayerCard(this, playerCardJson));
      this._currentSpentTokenTotal = Utils.getJsonEntry(
        json,
        "currentSpentTokenTotal",
      ) as number;
      this._currentTokenTotal = Utils.getJsonEntry(
        json,
        "currentTokenTotal",
      ) as number;
      this._currentTurn =
        (Utils.getJsonEntry(json, "currentTurn") as TurnJson | null) !== null
          ? new Turn(Utils.getJsonEntry(json, "currentTurn") as TurnJson)
          : null;
      this.globalName = Utils.getJsonEntry(json, "globalName") as string;
      this.handResults = Utils.getJsonEntry(
        json,
        "handResults",
      ) as HandResult[];
      this.id = Utils.getJsonEntry(json, "id") as string;
      this.status = Utils.getJsonEntry(json, "status") as PlayerStatus;
      this.username = Utils.getJsonEntry(json, "username") as string;
    }
  }

  public get currentSpentTokenTotal(): number {
    return this._currentSpentTokenTotal;
  }

  public get currentTokenTotal(): number {
    return this._currentTokenTotal;
  }

  public get currentTurn(): Turn | null {
    return this._currentTurn;
  }

  public get isEliminated(): boolean {
    return this.status === PlayerStatus.ELIMINATED;
  }

  private validateActiveStatus(): void {
    if (this.status !== PlayerStatus.ACTIVE) {
      Log.throw("Player is not active.", this);
    }
  }

  private validateCard(playerCard: PlayerCard): void {
    this.validateActiveStatus();
    if (!this.currentPlayerCards.includes(playerCard)) {
      Log.throw(
        "Player card validation failed. Player does not contain the card.",
        this,
        playerCard,
      );
    }
  }

  public addCard(card: Card, source: PlayerCardSource): void {
    this.validateActiveStatus();
    const playerCard: PlayerCard = new PlayerCard(this, card, source);
    this.currentPlayerCards.push(playerCard);
    this.currentPlayerCards.sort((a, b) =>
      GameController.sortPlayerCards(a, b),
    );
  }

  public eliminate(): void {
    this.validateActiveStatus();
    this.status = PlayerStatus.ELIMINATED;
  }

  public endTurn(): void {
    this.validateActiveStatus();
    if (this._currentTurn === null) {
      Log.throw("Cannot end turn. Current turn is not set.", this);
    }
    if (!this._currentTurn.isResolved) {
      Log.throw("Cannot end turn. Current turn is not resolved.", this);
    }
    this._currentTurn = null;
  }

  public getCards(cardSuit?: CardSuit): PlayerCard[] {
    this.validateActiveStatus();
    this.currentPlayerCards.sort((a, b) =>
      GameController.sortPlayerCards(a, b),
    );
    if (cardSuit === undefined) {
      return this.currentPlayerCards;
    } else {
      return this.currentPlayerCards.filter(card => card.suit === cardSuit);
    }
  }

  public initialize(startingTokenTotal: number): void {
    if (this.status !== PlayerStatus.UNINITIALIZED) {
      Log.throw("Cannot initialize player. Player is not uninitialized.", this);
    }
    this.status = PlayerStatus.ACTIVE;
    this._currentTokenTotal = startingTokenTotal;
  }

  public removeCard(playerCard: PlayerCard): PlayerCard {
    this.validateActiveStatus();
    this.validateCard(playerCard);
    this.currentPlayerCards.splice(
      this.currentPlayerCards.indexOf(playerCard),
      1,
    );
    return playerCard;
  }

  public removeTokens(tokenTotal: number): void {
    this.validateActiveStatus();
    if (tokenTotal >= this._currentTokenTotal) {
      this.eliminate();
    } else {
      this._currentTokenTotal -= tokenTotal;
      if (this._currentSpentTokenTotal > this._currentTokenTotal) {
        this._currentSpentTokenTotal = this._currentTokenTotal;
      }
    }
  }

  public resetTokens(): void {
    this.validateActiveStatus();
    this._currentSpentTokenTotal = 0;
  }

  public spendTokens(tokenTotal: number): void {
    this.validateActiveStatus();
    if (tokenTotal < 1) {
      Log.throw("Cannot spend tokens. Total to spend was less than one.", {
        tokenTotal,
      });
    }
    if (this._currentSpentTokenTotal + tokenTotal > this._currentTokenTotal) {
      Log.throw(
        "Cannot spend tokens. Player token spent total is not less than the current total.",
        this,
        { tokenTotal },
      );
    }
    this._currentSpentTokenTotal += tokenTotal;
  }

  public startTurn(): Turn {
    this.validateActiveStatus();
    if (this._currentTurn !== null) {
      Log.throw("Cannot start turn. Current turn record is already set.", this);
    }
    this._currentTurn = new Turn();
    return this._currentTurn;
  }

  public toJson(): PlayerJson {
    return {
      avatarId: this.avatarId,
      currentPlayerCards: this.currentPlayerCards.map(playerCard =>
        playerCard.toJson(),
      ),
      currentSpentTokenTotal: this._currentSpentTokenTotal,
      currentTokenTotal: this._currentTokenTotal,
      currentTurn:
        this._currentTurn !== null ? this._currentTurn.toJson() : null,
      id: this.id,
      globalName: this.globalName,
      handResults: this.handResults,
      status: this.status,
      username: this.username,
    };
  }
}
