import { Random } from "random-js";
import { Player, PlayerCard } from ".";
import { ChannelState } from "..";
import { bloodDeck, sandDeck } from "../../constants/game/decks";
import { InteractionController } from "../../controllers";
import { Json, Log, Saveable, Utils } from "../../core";
import { DiscordUser } from "../../core/discord";
import { CardSuit, PlayerCardSource, SessionStatus } from "../../enums";
import { Card, HandResult, PlayerJson, SessionJson } from "../../types";

// TODO: Start cleaning this up once "play.ts" works and "player.ts" is in a good spot; keep everything possible private, then consolidate and simplify once all errors are gone
export class Session implements Saveable {
  private bloodDeck: Card[];

  private bloodDiscard: Card[] = [];

  private channelState: ChannelState;

  private currentHandIndex: number = 0;

  private currentPlayerIndex: number = 0;

  private _currentRoundIndex: number = 0;

  private handResults: HandResult[][] = [];

  private playerOrder: string[] = [];

  private players: Record<string, Player> = {};

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
    this.validateActiveStatus();
    if (!(playerId in this.players)) {
      return null;
    }
    return this.players[playerId];
  }

  private validatePendingStatus(): void {
    if (this._status !== SessionStatus.PENDING) {
      Log.throw("Session is not pending.", this);
    }
  }

  private validateActiveStatus(): void {
    if (this._status !== SessionStatus.ACTIVE) {
      Log.throw("Session is not active.", this);
    }
  }

  public createPlayer(discordUser: DiscordUser): Player {
    this.validatePendingStatus();
    if (discordUser.id in this.players) {
      Log.throw(
        "Cannot create player. A player already exists with the provided ID.",
        this,
        discordUser,
      );
    }
    this.players[discordUser.id] = new Player(this, discordUser);
    return this.players[discordUser.id];
  }

  public get activePlayerTotal(): number {
    return Object.values(this.players).filter(player => !player.isEliminated)
      .length;
  }

  public get currentPlayer(): Player {
    this.validateActiveStatus();
    return this.players[this.playerOrder[this.currentPlayerIndex]];
  }

  private validatePlayer(player: Player): void {
    if (!Object.values(this.players).includes(player)) {
      Log.throw(
        "Session player validation failed. Session does not contain the player.",
        this,
        player,
      );
    }
  }

  public get currentRoundIndex(): number {
    this.validateActiveStatus();
    return this._currentRoundIndex;
  }

  public get status(): SessionStatus {
    return this._status;
  }

  private set status(value: SessionStatus) {
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
    Object.values(this.players).forEach(player => {
      this.playerOrder.push(player.id);
      player.initialize(this.startingTokenTotal);
    });
    new Random().shuffle(this.playerOrder);
  }

  private setHandResults(handResults: HandResult[]): void {
    if (this.handResults.length !== this.currentHandIndex) {
      Log.throw(
        "Cannot set hand results. Current results set contained the wrong number of entries.",
        this,
        handResults,
      );
    }
    this.handResults[this.currentHandIndex - 1] = handResults;
  }

  private async endGame(): Promise<void> {
    this.status = SessionStatus.COMPLETED;
    await InteractionController.announceGameEnded(this);
  }

  public addCardToDiscard(card: Card): void {
    switch (card.suit) {
      case CardSuit.BLOOD:
        this.bloodDiscard.unshift(card);
        break;
      case CardSuit.SAND:
        this.sandDiscard.unshift(card);
        break;
      default:
        Log.throw("Cannot add card to discard. Unknown card suit.");
    }
  }

  private async endHand(): Promise<void> {
    const partialHandResults: Pick<
      HandResult,
      | "bloodCard"
      | "bloodCardValue"
      | "cardDifference"
      | "lowestCardValue"
      | "playerId"
      | "sandCard"
      | "sandCardValue"
      | "spentTokenTotal"
    >[] = Object.values(this.players)
      .filter(player => !player.isEliminated)
      .map(player => {
        if (player.currentTurn !== null) {
          Log.throw(
            "Cannot end hand. A player ended the round with a current turn still set.",
            player,
          );
        }
        const bloodPlayerCards: PlayerCard[] = player.getCards(CardSuit.BLOOD);
        const sandPlayerCards: PlayerCard[] = player.getCards(CardSuit.SAND);
        if (bloodPlayerCards.length !== 1 || sandPlayerCards.length !== 1) {
          Log.throw(
            "Cannot end hand. A player ended the round without exactly one card from each suit.",
            player,
          );
        }
        const bloodPlayerCard: PlayerCard = bloodPlayerCards[0];
        const sandPlayerCard: PlayerCard = sandPlayerCards[0];
        const bloodCardValue: number = bloodPlayerCard.getValue(sandPlayerCard);
        const sandCardValue: number = sandPlayerCard.getValue(bloodPlayerCard);
        return {
          bloodCard: bloodPlayerCard,
          bloodCardValue: bloodCardValue,
          cardDifference: Math.abs(bloodCardValue - sandCardValue),
          lowestCardValue: Math.min(bloodCardValue, sandCardValue),
          playerId: player.id,
          sandCard: sandPlayerCard,
          sandCardValue: sandCardValue,
          spentTokenTotal: player.currentSpentTokenTotal,
        };
      });

    partialHandResults.sort((a, b) => this.handResultSort(a, b));

    let currentRankIndex: number = 0;
    const handResults: HandResult[] = partialHandResults.map(
      (partialHandResult, index) => {
        const isSabacc: boolean =
          partialHandResult.bloodCardValue === partialHandResult.sandCardValue;
        const isTiedWithPrevious: boolean =
          index !== 0 &&
          this.handResultSort(
            partialHandResult,
            partialHandResults[index - 1],
          ) === 0;
        if (index !== 0 && !isTiedWithPrevious) {
          currentRankIndex++;
        }
        const tokenPenaltyTotal: number =
          currentRankIndex === 0
            ? 0
            : isSabacc
              ? 1
              : partialHandResult.cardDifference;
        const tokenLossTotal: number =
          currentRankIndex === 0
            ? 0
            : partialHandResult.spentTokenTotal + tokenPenaltyTotal;
        return {
          ...partialHandResult,
          rankIndex: currentRankIndex,
          tokenLossTotal: tokenLossTotal,
          tokenPenaltyTotal: tokenPenaltyTotal,
        };
      },
    );

    handResults.forEach(handResult => {
      const player: Player | null = this.getPlayerById(handResult.playerId);
      if (player === null) {
        Log.throw(
          "Cannot end hand. Hand result player does not exist in the sesion.",
          handResult,
          this,
        );
      }
      player.removeTokens(handResult.tokenLossTotal);
      if (!player.isEliminated) {
        player.resetTokens();
      }
    });

    await InteractionController.announceHandEnded(this);
    if (this.activePlayerTotal === 1) {
      await this.endGame();
    } else if (this.activePlayerTotal > 1) {
      this.currentHandIndex++;
      this.iterateStartingPlayer();
      this.shuffleAndDealCards();
    } else {
      Log.throw("Cannot end hand. Zero active players remain.", this);
    }
  }

  private drawPlayerCard(
    session: Session,
    player: Player,
    drawSource: Exclude<PlayerCardSource, PlayerCardSource.DEALT>,
  ): void {
    this.validatePlayer(player);

    if (
      player.currentTurnRecord === null ||
      player.currentTurnRecord.action !== TurnAction.DRAW ||
      player.currentTurnRecord.status !== TurnStatus.ACTIVE
    ) {
      Log.throw(
        "Cannot draw player card. Player turn record is invalid.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.drawnCard !== null) {
      Log.throw(
        "Cannot draw player card. Player turn record already contains a drawn card.",
        player.currentTurnRecord,
      );
    }
    if (player.currentSpentTokenTotal >= player.currentTokenTotal) {
      Log.throw(
        "Cannot draw player card. Player does not have tokens to spend.",
        player.currentTurnRecord,
      );
    }

    player.currentSpentTokenTotal++;
    let drawSourceSet: Card[];
    let playerCardSet: PlayerCard[];

    switch (drawSource) {
      case PlayerCardSource.BLOOD_DECK:
        drawSourceSet = session.bloodDeck;
        playerCardSet = player.currentBloodCards;
        break;
      case PlayerCardSource.BLOOD_DISCARD:
        drawSourceSet = session.bloodDiscard;
        playerCardSet = player.currentBloodCards;
        break;
      case PlayerCardSource.SAND_DECK:
        drawSourceSet = session.sandDeck;
        playerCardSet = player.currentSandCards;
        break;
      case PlayerCardSource.SAND_DISCARD:
        drawSourceSet = session.sandDiscard;
        playerCardSet = player.currentSandCards;
        break;
      default:
        Log.throw("Cannot draw player card. Unknown draw source.", drawSource);
    }

    if (drawSourceSet.length === 0) {
      Log.throw(
        "Cannot draw player card. Draw source was empty.",
        drawSource,
        session,
      );
    }

    const card: Card = Utils.removeTopArrayItem(drawSourceSet);
    const playerCard: PlayerCard = {
      card: card,
      dieRollValues: [],
      source: drawSource,
    };
    playerCardSet.push(playerCard);
    player.currentTurnRecord.drawnCard = playerCard;
  }

  private async endTurn(session: Session): Promise<void> {
    const currentPlayer: Player = DataController.getPlayerById(
      session,
      session.playerOrder[session.currentPlayerIndex],
    );
    if (
      currentPlayer.currentTurnRecord === null ||
      currentPlayer.currentTurnRecord.status !== TurnStatus.COMPLETED
    ) {
      Log.throw(
        "Cannot end turn. Current player turn record is invalid.",
        currentPlayer.currentTurnRecord,
      );
    }

    await InteractionController.announceTurnEnded(session);
    const isLastPlayer: boolean =
      session.currentPlayerIndex === session.playerOrder.length - 1;
    session.currentPlayerIndex = isLastPlayer
      ? 0
      : session.currentPlayerIndex + 1;

    if (isLastPlayer) {
      await this.endRound(session);
    }
    if (session.status === SessionStatus.ACTIVE) {
      await this.startTurn(session);
    }
  }

  private finalizePlayerCards(session: Session, player: Player): void {
    DataController.validateSessionPlayer(session, player);

    if (
      player.currentTurnRecord === null ||
      player.currentTurnRecord.action !== TurnAction.REVEAL ||
      player.currentTurnRecord.status !== TurnStatus.ACTIVE
    ) {
      Log.throw(
        "Cannot finalize player cards. Player turn record is invalid.",
        player.currentTurnRecord,
      );
    }

    player.currentTurnRecord.status = TurnStatus.COMPLETED;
  }

  private generatePlayerCardDieRollValues(
    session: Session,
    player: Player,
    playerCard: PlayerCard,
  ): void {
    DataController.validateSessionPlayer(session, player);
    DataController.validatePlayerCard(player, playerCard);

    if (playerCard.dieRollValues.length !== 0) {
      Log.throw(
        "Cannot generate player card die roll values. Values already exist on player card.",
        playerCard,
      );
    }

    const random: Random = new Random();
    playerCard.dieRollValues.push(random.die(6), random.die(6));
  }

  private setPlayerCardDieRollValue(
    session: Session,
    player: Player,
    playerCard: PlayerCard,
    dieValue: number,
  ): void {
    DataController.validateSessionPlayer(session, player);
    DataController.validatePlayerCard(player, playerCard);

    if (!playerCard.dieRollValues.includes(dieValue)) {
      Log.throw(
        "Cannot set player card die roll value. Value does not exist in player card value set.",
        playerCard,
      );
    }

    Utils.emptyArray(playerCard.dieRollValues);
    playerCard.dieRollValues.push(dieValue);
  }

  private setPlayerTurnAction(
    session: Session,
    player: Player,
    turnAction: TurnAction | null,
  ): void {
    DataController.validateSessionPlayer(session, player);

    switch (turnAction) {
      case TurnAction.DRAW:
        player.currentTurnRecord = {
          action: TurnAction.DRAW,
          discardedCard: null,
          drawnCard: null,
          status: TurnStatus.ACTIVE,
        };
        break;
      case TurnAction.REVEAL:
        player.currentTurnRecord = {
          action: TurnAction.REVEAL,
          status: TurnStatus.ACTIVE,
        };
        break;
      case TurnAction.STAND:
        player.currentTurnRecord = {
          action: TurnAction.STAND,
          status: TurnStatus.ACTIVE,
        };
        break;
      case null:
        player.currentTurnRecord = null;
        break;
      default:
        Log.throw("Cannot set player turn action. Unknown turn action.", {
          turnAction,
        });
    }
  }

  private standPlayer(session: Session, player: Player): void {
    DataController.validateSessionPlayer(session, player);

    if (
      player.currentTurnRecord === null ||
      player.currentTurnRecord.action !== TurnAction.STAND ||
      player.currentTurnRecord.status !== TurnStatus.ACTIVE
    ) {
      Log.throw(
        "Cannot stand player. Player turn record is invalid.",
        player.currentTurnRecord,
      );
    }

    player.currentTurnRecord.status = TurnStatus.COMPLETED;
  }

  private handResultSort(
    a: Pick<HandResult, "cardDifference" | "lowestCardValue">,
    b: Pick<HandResult, "cardDifference" | "lowestCardValue">,
  ): number {
    const cardDifference: number = a.cardDifference - b.cardDifference;
    if (cardDifference !== 0) {
      return cardDifference;
    }
    const valueDifference: number = a.lowestCardValue - b.lowestCardValue;
    return valueDifference;
  }

  private iterateStartingPlayer(): void {
    const currentFirstPlayerId: string | undefined = this.playerOrder.shift();
    if (currentFirstPlayerId === undefined) {
      Log.throw(
        "Cannot iterate starting player. Player order list is empty.",
        this,
      );
    }
    this.playerOrder.push(currentFirstPlayerId);
  }

  private async endRound(): Promise<void> {
    const isGameRound: boolean = this._currentRoundIndex < 3;
    this._currentRoundIndex = isGameRound ? this._currentRoundIndex + 1 : 0;
    if (!isGameRound) {
      await this.endHand();
    }
    if (this.status === SessionStatus.ACTIVE) {
      await InteractionController.announceRoundStarted(this);
    }
  }

  public async startGame(): Promise<void> {
    this.validatePendingStatus();
    if (this._status !== SessionStatus.PENDING) {
      Log.throw("Cannot start game. Session is not currently pending.", this);
    }
    if (Object.entries(this.players).length <= 1) {
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
    await InteractionController.announceTurnStarted(this);
  }

  private get orderedPlayers(): Player[] {
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
    this.orderedPlayers.forEach(player => {
      const playerCards: PlayerCard[] = player.getCards();
      playerCards.forEach(playerCard => {
        this.addCardToDiscard(playerCard.toCard());
      });
    });
    this.bloodDeck.push(...this.bloodDiscard);
    this.sandDeck.push(...this.sandDiscard);
    Utils.emptyArray(this.bloodDiscard);
    Utils.emptyArray(this.sandDiscard);

    const random: Random = new Random();
    random.shuffle(this.bloodDeck);
    random.shuffle(this.sandDeck);

    this.orderedPlayers.forEach(player => {
      player.addCard(
        Utils.removeTopArrayItem(this.bloodDeck),
        PlayerCardSource.DEALT,
      );
      player.addCard(
        Utils.removeTopArrayItem(this.sandDeck),
        PlayerCardSource.DEALT,
      );
    });

    this.addCardToDiscard(Utils.removeTopArrayItem(this.bloodDeck));
    this.addCardToDiscard(Utils.removeTopArrayItem(this.sandDeck));
  }

  public playerDrawCard(player: Player, cardSuit: CardSuit): Card {
    this.validatePlayer(player);
    switch (cardSuit) {
      case CardSuit.BLOOD:
        return Utils.removeTopArrayItem(this.bloodDeck);
      case CardSuit.SAND:
        return Utils.removeTopArrayItem(this.sandDeck);
      default:
        Log.throw("Could not draw card. Unknown card suit.", this, {
          cardSuit,
        });
    }
  }

  private discardCard(card: Card): void {
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
      currentHandIndex: this.currentHandIndex,
      currentPlayerIndex: this.currentPlayerIndex,
      currentRoundIndex: this._currentRoundIndex,
      handResults: this.handResults,
      playerOrder: this.playerOrder,
      players: Object.fromEntries(
        Object.entries(this.players).map(([playerId, player]) => [
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
    channelState: ChannelState,
    startingDiscordUser: DiscordUser,
    startingTokenTotal: number,
  );

  constructor(channelState: ChannelState, json: Json);

  constructor(
    channelState: ChannelState,
    startingDiscordUserOrJson: DiscordUser | Json,
    startingTokenTotal?: number,
  ) {
    this.channelState = channelState;
    if (startingDiscordUserOrJson instanceof DiscordUser) {
      const discordUser: DiscordUser = startingDiscordUserOrJson;
      if (startingTokenTotal === undefined) {
        Log.throw(
          "Cannot construct session. Constructor was missing required arguments.",
          { startingTokenTotal },
        );
      }
      this.bloodDeck = this.instantiateDeck(bloodDeck);
      this.sandDeck = this.instantiateDeck(sandDeck);
      this.startingPlayerId = discordUser.id;
      this.startingTokenTotal = startingTokenTotal;
      this.createPlayer(discordUser);
    } else {
      const json: Json = startingDiscordUserOrJson;
      this.bloodDeck = Utils.getJsonEntry(json, "bloodDeck") as Card[];
      this.bloodDiscard = Utils.getJsonEntry(json, "bloodDiscard") as Card[];
      this.currentHandIndex = Utils.getJsonEntry(
        json,
        "currentHandIndex",
      ) as number;
      this.currentPlayerIndex = Utils.getJsonEntry(
        json,
        "currentPlayerIndex",
      ) as number;
      this._currentRoundIndex = Utils.getJsonEntry(
        json,
        "currentRoundIndex",
      ) as number;
      this.handResults = Utils.getJsonEntry(
        json,
        "handResults",
      ) as HandResult[][];
      this.playerOrder = Utils.getJsonEntry(json, "playerOrder") as string[];
      this.players = Object.fromEntries(
        Object.entries(
          Utils.getJsonEntry(json, "players") as Record<string, PlayerJson>,
        ).map(([playerId, playerJson]) => [
          playerId,
          new Player(this, playerJson),
        ]),
      );
      this.sandDeck = Utils.getJsonEntry(json, "sandDeck") as Card[];
      this.sandDiscard = Utils.getJsonEntry(json, "sandDiscard") as Card[];
      this.startedAt = Utils.getJsonEntry(json, "startedAt") as number | null;
      this.startingPlayerId = Utils.getJsonEntry(
        json,
        "startingPlayerId",
      ) as string;
      this.startingTokenTotal = Utils.getJsonEntry(
        json,
        "startingTokenTotal",
      ) as number;
      this._status = Utils.getJsonEntry(json, "status") as SessionStatus;
    }
  }
}
