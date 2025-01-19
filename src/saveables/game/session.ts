import { Random } from "random-js";
import { Player } from ".";
import { bloodDeck, sandDeck } from "../../constants/game/decks";
import { InteractionController } from "../../controllers";
import { Json, Log, Saveable, Utils } from "../../core";
import { CardSuit, PlayerCardSource, SessionStatus } from "../../enums";
import { Card, HandResult, PlayerJson, SessionJson } from "../../types";

export class Session implements Saveable {
  private bloodDeck: Card[];

  private bloodDiscard: Card[] = [];

  public readonly channelId: string;

  private currentHandIndex: number = 0;

  private currentPlayerIndex: number = 0;

  private currentRoundIndex: number = 0;

  private handResults: HandResult[][] = [];

  private playerOrder: string[] = [];

  private _players: Record<string, Player> = {};

  private sandDeck: Card[];

  private sandDiscard: Card[] = [];

  private startedAt: number | null = null;

  private startingPlayerId: string;

  private startingTokenTotal: number;

  private _status: SessionStatus = SessionStatus.PENDING;

  private instantiateDeck(sourceDeck: Card[]): Card[] {
    return [...sourceDeck]; // Return a fresh copy of the deck
  }

  public getPlayerById(playerId: string): Player | null {
    if (!(playerId in this._players)) {
      return null;
    }
    return this._players[playerId];
  }

  public addPlayers(players: Player[]): void {
    players.forEach(player => {
      if (player.id in this._players) {
        Log.throw(
          "Cannot add player to session. Player has already been added.",
          this,
          player,
        );
      }
      this._players[player.id] = player;
    });
  }

  public set status(value: SessionStatus) {
    if (value === SessionStatus.PENDING) {
      Log.error("Session status was directly set to pending.", this);
    }
    if (
      value === SessionStatus.ACTIVE &&
      this._status !== SessionStatus.PENDING
    ) {
      Log.error("Session status was set to active but was not pending.", this);
    }
    if (
      value === SessionStatus.COMPLETED &&
      this._status !== SessionStatus.ACTIVE
    ) {
      Log.error(
        "Session status was set to completed but was not active.",
        this,
      );
    }
    this._status = value;
  }

  private initializePlayers(): void {
    Utils.emptyArray(this.playerOrder);
    Object.values(this._players).forEach(player => {
      this.playerOrder.push(player.id);
      player.initialize(this.startingTokenTotal);
    });
    new Random().shuffle(this.playerOrder);
  }

  public async startGame(): Promise<void> {
    if (this._status !== SessionStatus.PENDING) {
      Log.throw("Cannot start game. Session is not currently pending.", this);
    }
    if (Object.entries(this._players).length <= 1) {
      Log.throw("Cannot start game. Player count is too low.", this);
    }

    this.startedAt = Date.now();
    this._status = SessionStatus.ACTIVE;
    this.initializePlayers();
    this.shuffleAndDealCards();
    await InteractionController.announceRoundStarted(this);
    await this.startTurn();
  }

  private async startTurn(): Promise<void> {
    Object.values(this._players).forEach(
      player => (player.currentTurnRecord = null),
    );
    await InteractionController.announceTurnStarted(this);
  }

  public get players(): Player[] {
    return this.playerOrder.map(playerId => {
      const player: Player | null = this.getPlayerById(playerId);
      if (player === null) {
        Log.throw(
          "Cannot create ordered player list. Player ID from order list was undefined in the player set.",
          this,
          { playerId },
        );
      }
      return player;
    });
  }

  private shuffleAndDealCards(): void {
    const random: Random = new Random();
    this.bloodDeck.push(...this.bloodDiscard);
    Utils.emptyArray(this.bloodDiscard);
    this.sandDeck.push(...this.sandDiscard);
    Utils.emptyArray(this.sandDiscard);

    this.players.forEach(player => {
      player.removeAllCards().forEach(card => {
        switch (card.suit) {
          case CardSuit.BLOOD:
            this.bloodDeck.push(card);
            break;
          case CardSuit.SAND:
            this.sandDeck.push(card);
            break;
          default:
            Log.throw(
              "Could not shuffle and deal cards. Unknown card suit.",
              this,
              card,
            );
        }
      });
    });

    random.shuffle(this.bloodDeck);
    random.shuffle(this.sandDeck);

    this.players.forEach(player => {
      player.addCard(
        Utils.removeTopArrayItem(this.bloodDeck),
        PlayerCardSource.DEALT,
      );
      player.addCard(
        Utils.removeTopArrayItem(this.sandDeck),
        PlayerCardSource.DEALT,
      );
    });

    this.discardCard(this.drawCard(CardSuit.BLOOD));
    this.discardCard(this.drawCard(CardSuit.SAND));
  }

  public drawCard(cardSuit: CardSuit): Card {
    let deck: Card[];
    switch (cardSuit) {
      case CardSuit.BLOOD:
        deck = this.bloodDeck;
        break;
      case CardSuit.SAND:
        deck = this.sandDeck;
        break;
      default:
        Log.throw("Could not draw card. Unknown card suit.", this, {
          cardSuit,
        });
    }
    return Utils.removeTopArrayItem(deck);
  }

  public discardCard(card: Card): void {
    let discard: Card[];
    switch (card.suit) {
      case CardSuit.BLOOD:
        discard = this.bloodDiscard;
        break;
      case CardSuit.SAND:
        discard = this.sandDiscard;
        break;
      default:
        Log.throw("Could not discard card. Unknown card suit.", this, card);
    }
    discard.unshift(card);
  }

  public toJson(): SessionJson {
    return {
      bloodDeck: this.bloodDeck,
      bloodDiscard: this.bloodDiscard,
      channelId: this.channelId,
      currentHandIndex: this.currentHandIndex,
      currentPlayerIndex: this.currentPlayerIndex,
      currentRoundIndex: this.currentRoundIndex,
      handResults: this.handResults,
      playerOrder: this.playerOrder,
      players: Object.fromEntries(
        Object.entries(this._players).map(([playerId, player]) => [
          playerId,
          player.toJson(),
        ]),
      ),
      sandDeck: this.sandDeck,
      sandDiscard: this.sandDiscard,
      startedAt: this.startedAt,
      startingPlayerId: this.startingPlayerId,
      startingTokenTotal: this.startingTokenTotal,
      status: this._status,
    };
  }

  constructor(
    channelId: string,
    startingPlayer: Player,
    startingTokenTotal: number,
  );

  constructor(json: Json);

  constructor(
    channelIdOrJson: string | Json,
    startingPlayer?: Player,
    startingTokenTotal?: number,
  ) {
    if (typeof channelIdOrJson === "string") {
      if (startingPlayer === undefined || startingTokenTotal === undefined) {
        Log.throw(
          "Cannot construct session. Constructor was missing required arguments.",
          { channelId: channelIdOrJson, startingPlayer, startingTokenTotal },
        );
      }
      this.bloodDeck = this.instantiateDeck(bloodDeck);
      this.channelId = channelIdOrJson;
      this._players[startingPlayer.id] = startingPlayer;
      this.sandDeck = this.instantiateDeck(sandDeck);
      this.startingPlayerId = startingPlayer.id;
      this.startingTokenTotal = startingTokenTotal;
    } else {
      this.bloodDeck = Utils.getJsonEntry(
        channelIdOrJson,
        "bloodDeck",
      ) as Card[];
      this.bloodDiscard = Utils.getJsonEntry(
        channelIdOrJson,
        "bloodDiscard",
      ) as Card[];
      this.channelId = Utils.getJsonEntry(
        channelIdOrJson,
        "channelId",
      ) as string;
      this.currentHandIndex = Utils.getJsonEntry(
        channelIdOrJson,
        "currentHandIndex",
      ) as number;
      this.currentPlayerIndex = Utils.getJsonEntry(
        channelIdOrJson,
        "currentPlayerIndex",
      ) as number;
      this.currentRoundIndex = Utils.getJsonEntry(
        channelIdOrJson,
        "currentRoundIndex",
      ) as number;
      this.handResults = Utils.getJsonEntry(
        channelIdOrJson,
        "handResults",
      ) as HandResult[][];
      this.playerOrder = Utils.getJsonEntry(
        channelIdOrJson,
        "playerOrder",
      ) as string[];
      this._players = Object.fromEntries(
        Object.entries(
          Utils.getJsonEntry(channelIdOrJson, "players") as Record<
            string,
            PlayerJson
          >,
        ).map(([playerId, playerJson]) => [playerId, new Player(playerJson)]),
      );
      this.sandDeck = Utils.getJsonEntry(channelIdOrJson, "sandDeck") as Card[];
      this.sandDiscard = Utils.getJsonEntry(
        channelIdOrJson,
        "sandDiscard",
      ) as Card[];
      this.startedAt = Utils.getJsonEntry(channelIdOrJson, "startedAt") as
        | number
        | null;
      this.startingPlayerId = Utils.getJsonEntry(
        channelIdOrJson,
        "startingPlayerId",
      ) as string;
      this.startingTokenTotal = Utils.getJsonEntry(
        channelIdOrJson,
        "startingTokenTotal",
      ) as number;
      this._status = Utils.getJsonEntry(
        channelIdOrJson,
        "status",
      ) as SessionStatus;
    }
  }
}
