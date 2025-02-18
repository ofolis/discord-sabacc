import * as discordJs from "discord.js";
import { HandResult, Player, PlayerCard, Turn } from ".";
import { DECK } from "../../constants";
import { Environment, Json, Log, Saveable, Utils } from "../../core";
import {
  CardSuit,
  DrawSource,
  GameStatus,
  PlayerCardSource,
  PlayerStatus,
  TurnAction,
} from "../../enums";
import { Card, HandResultJson, PlayerJson, SessionJson } from "../../types";

export class Session implements Saveable {
  private __activePlayerIndex: number = 0;

  private __activePlayerOrder: string[] = [];

  private __cards: Record<CardSuit, Record<DrawSource, Card[]>>;

  private __gameStatus: GameStatus = GameStatus.PENDING;

  private __handIndex: number = 0;

  private __handResults: HandResult[] = [];

  private __players: Record<string, Player> = {};

  private __roundIndex: number = 0;

  private __startedAt: number | null = null;

  private __startingPlayerId: string;

  private __startingTokenTotal: number;

  private __winningPlayerId: string | null = null;

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
      this.__gameStatus = Utils.getJsonEntry(json, "gameStatus") as GameStatus;
      this.__handIndex = Utils.getJsonEntry(json, "handIndex") as number;
      const handResultsJson: HandResultJson[] = Utils.getJsonEntry(
        json,
        "handResults",
      ) as HandResultJson[];
      this.__handResults = handResultsJson.map(
        handResultJson => new HandResult(handResultJson),
      );
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
    }
  }

  public get activePlayerIndex(): number {
    return this.__activePlayerIndex;
  }

  public get activePlayersInTurnOrder(): readonly Player[] {
    return this.__activePlayerOrder.map(playerId => this.__players[playerId]);
  }

  public get allPlayers(): readonly Player[] {
    return Object.values(this.__players);
  }

  public get currentPlayer(): Player {
    if (this.__gameStatus !== GameStatus.ACTIVE) {
      Log.throw("Cannot get current player. Game is not active.", {
        gameStatus: this.__gameStatus,
      });
    }
    return this.__players[this.__activePlayerOrder[this.__activePlayerIndex]];
  }

  public get gameStatus(): GameStatus {
    return this.__gameStatus;
  }

  public get handIndex(): number {
    return this.__handIndex;
  }

  public get roundIndex(): number {
    return this.__roundIndex;
  }

  public get startingTokenTotal(): number {
    return this.__startingTokenTotal;
  }

  public get winningPlayer(): Player {
    if (this.__winningPlayerId === null) {
      Log.throw("Cannot get winning player. No winning player has been set.");
    }
    return this.__players[this.__winningPlayerId];
  }

  public addPlayers(users: discordJs.User[]): void {
    if (this.__gameStatus !== GameStatus.PENDING) {
      Log.throw("Cannot add players. Game is not pending.", {
        gameStatus: this.__gameStatus,
      });
    }
    users.forEach(user => {
      this.__createPlayer(user);
    });
  }

  public clearPlayerRoundTurns(): void {
    if (this.__gameStatus !== GameStatus.ACTIVE) {
      Log.throw("Cannot clear player round turns. Game is not active.", {
        gameStatus: this.__gameStatus,
      });
    }
    if (this.__activePlayerIndex !== 0) {
      Log.throw(
        "Cannot clear player round turns. Active player index is not currently 0.",
        {
          activePlayerIndex: this.__activePlayerIndex,
        },
      );
    }
    this.activePlayersInTurnOrder.forEach(activePlayer => {
      activePlayer["_clearRoundTurn"]();
    });
  }

  public createRoundTurnForCurrentPlayer(turnAction: TurnAction): Turn {
    if (this.__gameStatus !== GameStatus.ACTIVE) {
      Log.throw(
        "Cannot create round turn for current player. Game is not active.",
        { gameStatus: this.__gameStatus },
      );
    }
    return this.currentPlayer["_createRoundTurn"](turnAction);
  }

  public discardCardForCurrentPlayer(card: PlayerCard): void {
    if (this.__gameStatus !== GameStatus.ACTIVE) {
      Log.throw("Cannot discard card for current player. Game is not active.", {
        gameStatus: this.__gameStatus,
      });
    }
    this.currentPlayer["_discardCard"](card);
    this.__addCardToDiscard(card.card);
  }

  public drawCardForCurrentPlayer(
    cardSuit: CardSuit,
    drawSource: DrawSource,
  ): Card {
    if (this.__gameStatus !== GameStatus.ACTIVE) {
      Log.throw("Cannot draw card for current player. Game is not active.", {
        gameStatus: this.__gameStatus,
      });
    }
    this.currentPlayer["_spendToken"]();
    const card: Card = this.__drawCard(cardSuit, drawSource);
    this.currentPlayer["_drawCard"](card, drawSource);
    return card;
  }

  public finalizeHand(): void {
    // TODO: Account for zero players remaining (we can't assume win/loss based on player count)
    if (this.__gameStatus !== GameStatus.ACTIVE) {
      Log.throw("Cannot finalize hand. Game is not active.", {
        gameStatus: this.__gameStatus,
      });
    }
    if (
      this.__roundIndex !== 3 ||
      this.__activePlayerIndex !== this.__activePlayerOrder.length - 1
    ) {
      Log.throw(
        "Cannot finalize hand. This is not the last player in the last round of the hand.",
        {
          roundIndex: this.__roundIndex,
          activePlayerIndex: this.__activePlayerIndex,
        },
      );
    }
    if (this.__handResults.length !== this.__handIndex) {
      Log.throw(
        "Cannot finalize hand. The current hand result count is not equal to the hand index.",
        {
          handIndex: this.__handIndex,
          handResults: this.__handResults,
        },
      );
    }

    // Score the hand
    const handResult: HandResult = new HandResult(
      Object.values(this.activePlayersInTurnOrder),
    );
    this.__handResults.push(handResult);

    // Apply hand results
    const remainingPlayerIds: string[] = [];
    handResult.rankings.forEach(ranking => {
      const player: Player = this.getPlayerById(ranking.playerId);
      player["_deductTokens"](ranking.tokenLossTotal);
      if (player.status === PlayerStatus.ACTIVE) {
        remainingPlayerIds.push(player.id);
      }
    });

    handResult["_setRemainingPlayerIds"](remainingPlayerIds);
    this.__purgeEliminatedPlayersInTurnOrder();

    if (remainingPlayerIds.length === 0) {
      Log.throw(
        "Cannot finalize hand. Zero players remained after results were applied.",
        { handResult },
      );
    }
    if (remainingPlayerIds.length === 1) {
      this.__gameStatus = GameStatus.COMPLETED;
      this.__winningPlayerId = remainingPlayerIds[0];
    }
  }

  public getCurrentHandResult(): HandResult {
    if (this.__gameStatus === GameStatus.PENDING) {
      Log.throw("Cannot get current hand result. Game is pending.");
    }
    if (this.__handResults.length === 0) {
      Log.throw(
        "Cannot get current hand result. No hand results have been recorded.",
        { handIndex: this.__handIndex },
      );
    }
    if (this.__handResults.length !== this.__handIndex + 1) {
      Log.throw(
        "Cannot get current hand result. The current hand result count is not one greater than the hand index.",
        {
          handIndex: this.__handIndex,
          handResults: this.__handResults,
        },
      );
    }
    return this.__handResults[this.__handIndex];
  }

  public getDiscardOptionsForCurrentPlayer(): [PlayerCard, PlayerCard] {
    if (this.__gameStatus !== GameStatus.ACTIVE) {
      Log.throw(
        "Cannot get dicard card options for current player. Game is not active.",
        {
          gameStatus: this.__gameStatus,
        },
      );
    }
    const playerBloodCards: readonly PlayerCard[] = this.currentPlayer.getCards(
      CardSuit.BLOOD,
    );
    const playerSandCards: readonly PlayerCard[] = this.currentPlayer.getCards(
      CardSuit.SAND,
    );
    if (playerBloodCards.length < 2 && playerSandCards.length < 2) {
      Log.throw(
        "Cannot get dicard card options for current player. Player does not require a discard.",
        {
          bloodCards: playerBloodCards,
          sandCards: playerSandCards,
        },
      );
    }
    if (playerBloodCards.length >= 2 && playerSandCards.length >= 2) {
      Log.throw(
        "Cannot get dicard card options for current player. Player requires a discard from both suits.",
        {
          bloodCards: playerBloodCards,
          sandCards: playerSandCards,
        },
      );
    }
    if (playerBloodCards.length === 2) {
      return [playerBloodCards[0], playerBloodCards[1]];
    }
    if (playerSandCards.length === 2) {
      return [playerSandCards[0], playerSandCards[1]];
    }
    Log.throw(
      "Cannot get dicard card options for current player. Player has more than 2 cards in discard options.",
      {
        bloodCards: playerBloodCards,
        sandCards: playerSandCards,
      },
    );
  }

  public getPlayerById(id: string): Player {
    if (this.__gameStatus === GameStatus.PENDING) {
      Log.throw("Cannot get player state. Game is pending.");
    }
    if (!(id in this.__players)) {
      Log.throw(
        "Cannot get player state. Player ID is not defined in players.",
        { players: this.__players, id },
      );
    }
    return this.__players[id];
  }

  public getTopDiscardCard(cardSuit: CardSuit): Card | null {
    if (this.__cards[cardSuit][DrawSource.DISCARD].length > 0) {
      return this.__cards[cardSuit][DrawSource.DISCARD][0];
    }
    return null;
  }

  public initializeHand(): void {
    if (this.__gameStatus !== GameStatus.ACTIVE) {
      Log.throw("Cannot initialize hand. Game is not active.", {
        gameStatus: this.__gameStatus,
      });
    }
    if (this.__roundIndex !== 0 || this.__activePlayerIndex !== 0) {
      Log.throw(
        "Cannot initialize hand. Round index and active player index are not currently 0.",
        {
          roundIndex: this.__roundIndex,
          activePlayerIndex: this.__activePlayerIndex,
        },
      );
    }
    this.__collectCards();
    this.__shuffleDecks();
    if (this.__handIndex !== 0) {
      this.__iterateActivePlayerOrder();
    }
    this.__dealCardsToPlayers();
    this.__resetPlayerTokens();
  }

  public iterate(): void {
    // TODO: Skip rounds if no players have tokens
    if (this.__gameStatus !== GameStatus.ACTIVE) {
      Log.throw("Cannot iterate session. Game is not active.", {
        gameStatus: this.__gameStatus,
      });
    }
    this.__activePlayerIndex++;
    if (this.__activePlayerIndex >= this.__activePlayerOrder.length) {
      this.__activePlayerIndex = 0;
      this.__roundIndex++;
      if (this.__roundIndex > 3) {
        this.__roundIndex = 0;
        this.__handIndex++;
      }
    }
  }

  public playerExists(playerId: string): boolean {
    return playerId in this.__players;
  }

  public resolveRoundTurnForCurrentPlayer(): void {
    if (this.__gameStatus !== GameStatus.ACTIVE) {
      Log.throw(
        "Cannot resolve round turn for current player. Game is not active.",
        { gameStatus: this.__gameStatus },
      );
    }
    this.currentPlayer["_resolveRoundTurn"]();
  }

  public setPlayerCardDieRollsForCurrentPlayer(
    playerCard: PlayerCard,
    dieRolls: number[],
  ): void {
    if (this.__gameStatus !== GameStatus.ACTIVE) {
      Log.throw(
        "Cannot set player card die rolls for current player. Game is not active.",
        {
          gameStatus: this.__gameStatus,
        },
      );
    }
    if (!this.currentPlayer["_hasPlayerCard"](playerCard)) {
      Log.throw(
        "Cannot set player card die rolls for current player. Player does not have the specified card.",
        {
          playerCard,
          player: this.currentPlayer,
        },
      );
    }
    if (dieRolls.length === 2) {
      if (playerCard.dieRolls.length !== 0) {
        Log.throw(
          "Cannot set player card die rolls for current player. New die rolls length is 2 but existing die rolls length is not 0.",
          {
            dieRolls,
            playerCard,
          },
        );
      }
      playerCard["_dieRolls"] = dieRolls;
    } else if (dieRolls.length === 1) {
      if (playerCard.dieRolls.length !== 2) {
        Log.throw(
          "Cannot set player card die rolls for current player. New die rolls length is 1 but existing die rolls length is not 2.",
          {
            dieRolls,
            playerCard,
          },
        );
      }
      if (playerCard.dieRolls.indexOf(dieRolls[0]) === -1) {
        Log.throw(
          "Cannot set player card die rolls for current player. Specified die roll is not in the existing die roll set.",
          {
            dieRolls,
            playerCard,
          },
        );
      }
      playerCard["_dieRolls"] = dieRolls;
    } else {
      Log.throw(
        "Cannot set player card die rolls for current player. Die rolls length is not 1 or 2.",
        {
          dieRolls,
        },
      );
    }
  }

  public startGame(): void {
    if (this.__gameStatus !== GameStatus.PENDING) {
      Log.throw("Cannot start game. Game is not pending.", {
        gameStatus: this.__gameStatus,
      });
    }
    if (Object.entries(this.__players).length <= 1) {
      Log.throw("Cannot start game. Player count is too low.", {
        players: this.__players,
      });
    }
    this.__startedAt = Date.now();
    this.__gameStatus = GameStatus.ACTIVE;
    this.__initializePlayers();
  }

  public toJson(): SessionJson {
    return {
      activePlayerIndex: this.__activePlayerIndex,
      activePlayerOrder: this.__activePlayerOrder,
      cards: this.__cards,
      gameStatus: this.__gameStatus,
      handIndex: this.__handIndex,
      handResults: this.__handResults.map(handResult => handResult.toJson()),
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
    };
  }

  private __addCardToDiscard(card: Card): void {
    this.__cards[card.suit][DrawSource.DISCARD].unshift(card);
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
      const removedCards: Card[] = player["_removeAllCards"]();
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

  private __dealCardsToPlayers(): void {
    Object.values(this.__players).forEach(player => {
      const playerCardTotal: number = player.getCards().length;
      if (playerCardTotal !== 0) {
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
    this.activePlayersInTurnOrder.forEach(player => {
      player["_addCard"](
        this.__drawCard(CardSuit.BLOOD, DrawSource.DECK),
        PlayerCardSource.DEALT,
      );
      player["_addCard"](
        this.__drawCard(CardSuit.SAND, DrawSource.DECK),
        PlayerCardSource.DEALT,
      );
    });
    this.__addCardToDiscard(this.__drawCard(CardSuit.BLOOD, DrawSource.DECK));
    this.__addCardToDiscard(this.__drawCard(CardSuit.SAND, DrawSource.DECK));
  }

  private __drawCard(cardSuit: CardSuit, drawSource: DrawSource): Card {
    if (this.__cards[cardSuit][drawSource].length === 0) {
      Log.throw("Cannot draw card. Requested deck is empty.", {
        cardSuit,
        drawSource,
        cards: this.__cards,
      });
    }
    return Utils.removeTopArrayItem(this.__cards[cardSuit][drawSource]);
  }

  private __initializePlayers(): void {
    this.__activePlayerOrder = Object.keys(this.__players);
    Environment.random.shuffle(this.__activePlayerOrder);
    this.allPlayers.forEach(player => {
      player["_initialize"](this.__startingTokenTotal);
    });
  }

  private __iterateActivePlayerOrder(): void {
    if (this.__gameStatus !== GameStatus.ACTIVE) {
      Log.throw("Cannot iterate active player order. Game is not active.", {
        gameStatus: this.__gameStatus,
      });
    }
    const firstPlayerId: string | undefined = this.__activePlayerOrder.shift();
    if (firstPlayerId === undefined) {
      Log.throw(
        "Cannot iterate active player order. Active player order is empty.",
      );
    }
    this.__activePlayerOrder.push(firstPlayerId);
  }

  private __purgeEliminatedPlayersInTurnOrder(): void {
    const remainingPlayers: Player[] = this.activePlayersInTurnOrder.filter(
      player => player.status === PlayerStatus.ACTIVE,
    );
    this.__activePlayerOrder = remainingPlayers.map(player => player.id);
  }

  private __resetPlayerTokens(): void {
    Object.values(this.__players).forEach(player => {
      player["_resetTokens"]();
    });
  }

  private __shuffleDecks(): void {
    Environment.random.shuffle(this.__cards[CardSuit.BLOOD][DrawSource.DECK]);
    Environment.random.shuffle(this.__cards[CardSuit.SAND][DrawSource.DECK]);
  }
}
