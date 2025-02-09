import * as discordJs from "discord.js";
import { Random } from "random-js";
import { Player } from ".";
import { DECK } from "../../constants";
import { Json, Log, Saveable, Utils } from "../../core";
import {
  CardSuit,
  DrawSource,
  PlayerCardSource,
  SessionStatus,
} from "../../enums";
import { Card, HandResult, PlayerJson, SessionJson } from "../../types";

export class Session implements Saveable {
  private __activePlayerIndex: number = 0;

  private __activePlayerOrder: string[] = [];

  private __cards: Record<CardSuit, Record<DrawSource, Card[]>>;

  private __handIndex: number = 0;

  private __handResults: HandResult[][] = [];

  private __players: Record<string, Player> = {};

  private __roundIndex: number = 0;

  private __startedAt: number | null = null;

  private __startingPlayerId: string;

  private __startingTokenTotal: number;

  private __status: SessionStatus = SessionStatus.PENDING;

  public get activePlayers(): Player[] {
    return this.__activePlayerOrder.map(playerId => this.__players[playerId]);
  }

  public get allPlayers(): Player[] {
    return Object.values(this.__players);
  }

  public get handIndex(): number {
    return this.__handIndex;
  }

  public get roundIndex(): number {
    return this.__roundIndex;
  }

  public get status(): SessionStatus {
    return this.__status;
  }

  public constructor(user: discordJs.User, startingTokenTotal: number);

  public constructor(json: Json);

  public constructor(
    userOrJson: discordJs.User | Json,
    startingTokenTotal?: number,
  ) {
    if (userOrJson instanceof discordJs.User) {
      const user: discordJs.User = userOrJson;
      if (startingTokenTotal === undefined) {
        Log.throw(
          "Cannot construct session. Constructor was missing required arguments.",
        );
      }
      this.__cards = {
        [CardSuit.BLOOD]: {
          [DrawSource.DECK]: DECK(CardSuit.BLOOD),
          [DrawSource.DISCARD]: [],
        },
        [CardSuit.SAND]: {
          [DrawSource.DECK]: DECK(CardSuit.SAND),
          [DrawSource.DISCARD]: [],
        },
      };
      this.__startingPlayerId = user.id;
      this.__startingTokenTotal = startingTokenTotal;
      // Create the first player
      this.__createPlayer(user);
    } else {
      const json: Json = userOrJson;
      this.__activePlayerIndex = Utils.getJsonEntry(
        json,
        "activePlayerIndex",
      ) as number;
      this.__activePlayerOrder = Utils.getJsonEntry(
        json,
        "activePlayerOrder",
      ) as string[];
      this.__cards = Utils.getJsonEntry(json, "cards") as Record<
        CardSuit,
        Record<DrawSource, Card[]>
      >;
      this.__handIndex = Utils.getJsonEntry(json, "handIndex") as number;
      this.__handResults = Utils.getJsonEntry(
        json,
        "handResults",
      ) as HandResult[][];
      this.__players = Object.fromEntries(
        Object.entries(
          Utils.getJsonEntry(json, "players") as Record<string, PlayerJson>,
        ).map(([playerId, playerJson]) => [playerId, new Player(playerJson)]),
      );
      this.__roundIndex = Utils.getJsonEntry(json, "roundIndex") as number;
      this.__startedAt = Utils.getJsonEntry(json, "startedAt") as number | null;
      this.__startingPlayerId = Utils.getJsonEntry(
        json,
        "startingPlayerId",
      ) as string;
      this.__startingTokenTotal = Utils.getJsonEntry(
        json,
        "startingTokenTotal",
      ) as number;
      this.__status = Utils.getJsonEntry(json, "status") as SessionStatus;
    }
  }

  private __collectCards(): void {
    // Collect discard
    this.__cards[CardSuit.BLOOD][DrawSource.DECK].push(
      ...this.__cards[CardSuit.BLOOD][DrawSource.DISCARD],
    );
    Utils.emptyArray(this.__cards[CardSuit.BLOOD][DrawSource.DISCARD]);
    this.__cards[CardSuit.SAND][DrawSource.DECK].push(
      ...this.__cards[CardSuit.SAND][DrawSource.DISCARD],
    );
    Utils.emptyArray(this.__cards[CardSuit.SAND][DrawSource.DISCARD]);
    // Collect player cards
    Object.values(this.__players).forEach(player => {
      const removedCards: Card[] = player.removeAllCards();
      removedCards.forEach(card => {
        this.__cards[card.suit][DrawSource.DECK].push(card);
      });
    });
  }

  private __createPlayer(user: discordJs.User): Player {
    if (user.id in this.__players) {
      Log.throw(
        "Cannot create player. A player already exists with the provided ID.",
        { players: this.__players, user },
      );
    }
    this.__players[user.id] = new Player(user);
    return this.__players[user.id];
  }

  private __dealCards(): void {
    this.activePlayers.forEach(player => {
      player.addCard(
        this.__drawCard(CardSuit.BLOOD, DrawSource.DECK),
        PlayerCardSource.DEALT,
      );
      player.addCard(
        this.__drawCard(CardSuit.SAND, DrawSource.DECK),
        PlayerCardSource.DEALT,
      );
    });
    this.__discardCard(this.__drawCard(CardSuit.BLOOD, DrawSource.DECK));
    this.__discardCard(this.__drawCard(CardSuit.SAND, DrawSource.DECK));
  }

  private __discardCard(card: Card): void {
    this.__cards[card.suit][DrawSource.DISCARD].push(card);
  }

  private __drawCard(cardSuit: CardSuit, drawSource: DrawSource): Card {
    return Utils.removeTopArrayItem(this.__cards[cardSuit][drawSource]);
  }

  private __initializePlayers(): void {
    this.__activePlayerOrder = Object.keys(this.__players);
    new Random().shuffle(this.__activePlayerOrder);
    this.activePlayers.forEach(player => {
      player.initialize(this.__startingTokenTotal);
    });
  }

  private __shuffleDecks(): void {
    const random: Random = new Random();
    random.shuffle(this.__cards[CardSuit.BLOOD][DrawSource.DECK]);
    random.shuffle(this.__cards[CardSuit.SAND][DrawSource.DECK]);
  }

  public addPlayers(users: discordJs.User[]): void {
    if (this.__status !== SessionStatus.PENDING) {
      Log.throw("Cannot add players. Session is not currently pending.", {
        status: this.__status,
      });
    }
    users.forEach(user => {
      this.__createPlayer(user);
    });
  }

  public dealCardsToPlayers(): void {
    if (this.__status !== SessionStatus.ACTIVE) {
      Log.throw(
        "Cannot deal cards to players. Session is not currently active.",
        { status: this.__status },
      );
    }
    if (this.__roundIndex !== 0 || this.__activePlayerIndex !== 0) {
      Log.throw(
        "Cannot deal cards to players. Round index and active player index are not currently 0.",
        {
          roundIndex: this.__roundIndex,
          activePlayerIndex: this.__activePlayerIndex,
        },
      );
    }
    Object.values(this.__players).forEach(player => {
      if (player.cardTotal !== 0) {
        Log.throw(
          "Cannot deal cards to players. One or more players still contain cards.",
          { players: this.__players },
        );
      }
    });
    if (
      this.__cards[CardSuit.BLOOD][DrawSource.DISCARD].length !== 0 ||
      this.__cards[CardSuit.SAND][DrawSource.DISCARD].length !== 0
    ) {
      Log.throw("Cannot deal cards to players. Discard still contains cards.", {
        cards: this.__cards,
      });
    }
    this.__dealCards();
  }

  public getPlayerState(playerId: string): PlayerJson {
    if (this.__status !== SessionStatus.ACTIVE) {
      Log.throw("Cannot get player state. Session is not currently active.", {
        status: this.__status,
      });
    }
    if (!(playerId in this.__players)) {
      Log.throw(
        "Cannot get player state. Player ID is not defined in players.",
        { players: this.__players, playerId },
      );
    }
    return this.__players[playerId].toJson();
  }

  public playerExists(playerId: string): boolean {
    return playerId in this.__players;
  }

  public resetDecks(): void {
    if (this.__status !== SessionStatus.ACTIVE) {
      Log.throw("Cannot reset decks. Session is not currently active.", {
        status: this.__status,
      });
    }
    if (this.__roundIndex !== 0 || this.__activePlayerIndex !== 0) {
      Log.throw(
        "Cannot reset decks. Round index and active player index are not currently 0.",
        {
          roundIndex: this.__roundIndex,
          activePlayerIndex: this.__activePlayerIndex,
        },
      );
    }
    this.__collectCards();
    this.__shuffleDecks();
  }

  public startGame(): void {
    if (this.__status !== SessionStatus.PENDING) {
      Log.throw("Cannot start game. Session is not currently pending.", {
        status: this.__status,
      });
    }
    if (Object.entries(this.__players).length <= 1) {
      Log.throw("Cannot start game. Player count is too low.", {
        players: this.__players,
      });
    }
    this.__startedAt = Date.now();
    this.__status = SessionStatus.ACTIVE;
    this.__initializePlayers();
  }

  public toJson(): SessionJson {
    return {
      activePlayerIndex: this.__activePlayerIndex,
      activePlayerOrder: this.__activePlayerOrder,
      cards: this.__cards,
      handIndex: this.__handIndex,
      handResults: this.__handResults,
      players: Object.fromEntries(
        Object.entries(this.__players).map(([playerId, player]) => [
          playerId,
          player.toJson(),
        ]),
      ),
      roundIndex: this.__roundIndex,
      startedAt: this.__startedAt,
      startingPlayerId: this.__startingPlayerId,
      startingTokenTotal: this.__startingTokenTotal,
      status: this.__status,
    };
  }
}
