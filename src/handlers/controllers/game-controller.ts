import { Random } from "random-js";
import { DataController, InteractionController } from "..";
import { Log, Utils } from "../../core";
import {
  CardSuit,
  CardType,
  PlayerCardSource,
  SessionStatus,
  TurnAction,
  TurnStatus,
} from "../../enums";
import { Card, HandResult, Player, PlayerCard, Session } from "../../types";

export class GameController {
  private static async endGame(session: Session): Promise<void> {
    session.status = SessionStatus.COMPLETED;
    await InteractionController.announceGameEnded(session);
  }

  private static async endHand(session: Session): Promise<void> {
    const partialHandResults: Pick<
      HandResult,
      | "bloodCard"
      | "bloodCardValue"
      | "cardDifference"
      | "lowestCardValue"
      | "playerIndex"
      | "sandCard"
      | "sandCardValue"
      | "spentTokenTotal"
    >[] = session.players
      .filter((player) => !player.isEliminated)
      .map((player) => {
        DataController.validatePlayerCardSets(player);
        if (
          player.currentBloodCards.length > 1 ||
          player.currentSandCards.length > 1
        ) {
          Log.throw(
            "Cannot end hand. A player ended the round without exactly one card from each suit.",
            player,
          );
        }
        const bloodPlayerCard: PlayerCard = player.currentBloodCards[0];
        const sandPlayerCard: PlayerCard = player.currentSandCards[0];
        const bloodCardValue: number = this.getFinalCardValue(
          bloodPlayerCard,
          sandPlayerCard,
        );
        const sandCardValue: number = this.getFinalCardValue(
          sandPlayerCard,
          bloodPlayerCard,
        );
        return {
          bloodCard: bloodPlayerCard,
          bloodCardValue: bloodCardValue,
          cardDifference: Math.abs(bloodCardValue - sandCardValue),
          lowestCardValue: Math.min(bloodCardValue, sandCardValue),
          playerIndex: session.players.indexOf(player),
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

    let remainingPlayerTotal: number = 0;
    handResults.forEach((handResult) => {
      const player: Player = session.players[handResult.playerIndex];
      if (handResult.tokenLossTotal >= player.currentTokenTotal) {
        handResult.tokenLossTotal = player.currentTokenTotal;
        player.currentTokenTotal = 0;
        player.isEliminated = true;
      } else {
        player.currentTokenTotal -= handResult.tokenLossTotal;
        remainingPlayerTotal++;
      }
      player.currentSpentTokenTotal = 0;
      player.handResults.push(handResult);
    });

    session.handResults.push(handResults);
    await InteractionController.announceHandEnded(session);

    if (remainingPlayerTotal <= 1) {
      await this.endGame(session);
    } else if (session.status === SessionStatus.ACTIVE) {
      session.currentHandIndex++;
      this.iterateStartingPlayer(session);
      this.shuffleAndDealCards(session);
    }
  }

  private static async endRound(session: Session): Promise<void> {
    const isGameRound: boolean = session.currentRoundIndex < 3;
    session.currentRoundIndex = isGameRound ? session.currentRoundIndex + 1 : 0;
    if (!isGameRound) {
      await this.endHand(session);
    }
    if (session.status === SessionStatus.ACTIVE) {
      await InteractionController.announceRoundStarted(session);
    }
  }

  private static handResultSort(
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

  private static iterateStartingPlayer(session: Session): void {
    const currentFirstPlayer: Player | undefined = session.players.shift();
    if (currentFirstPlayer === undefined) {
      Log.throw(
        "Cannot iterate starting player. Session player list is empty.",
        session,
      );
    }
    session.players.push(currentFirstPlayer);
  }

  private static shuffleAndDealCards(session: Session): void {
    const random: Random = new Random();
    session.bloodDeck.push(...session.bloodDiscard);
    Utils.emptyArray(session.bloodDiscard);
    session.sandDeck.push(...session.sandDiscard);
    Utils.emptyArray(session.sandDiscard);

    session.players.forEach((player) => {
      session.bloodDeck.push(
        ...player.currentBloodCards.map((card) => card.card),
      );
      Utils.emptyArray(player.currentBloodCards);
      session.sandDeck.push(
        ...player.currentSandCards.map((card) => card.card),
      );
      Utils.emptyArray(player.currentSandCards);
    });

    random.shuffle(session.bloodDeck);
    random.shuffle(session.sandDeck);

    session.players.forEach((player) => {
      player.currentBloodCards.push({
        card: Utils.removeTopArrayItem(session.bloodDeck),
        dieRollValues: [],
        source: PlayerCardSource.DEALT,
      });
      player.currentSandCards.push({
        card: Utils.removeTopArrayItem(session.sandDeck),
        dieRollValues: [],
        source: PlayerCardSource.DEALT,
      });
    });

    session.bloodDiscard.push(Utils.removeTopArrayItem(session.bloodDeck));
    session.sandDiscard.push(Utils.removeTopArrayItem(session.sandDeck));
  }

  private static async startTurn(session: Session): Promise<void> {
    session.players.forEach((player) => (player.currentTurnRecord = null));
    await InteractionController.announceTurnStarted(session);
  }

  public static discardPlayerCard(
    session: Session,
    player: Player,
    playerCard: PlayerCard,
  ): void {
    DataController.validateSessionPlayer(session, player);
    DataController.validatePlayerCardSets(player);
    DataController.validatePlayerCard(player, playerCard);

    if (
      player.currentTurnRecord === null ||
      player.currentTurnRecord.action !== TurnAction.DRAW ||
      player.currentTurnRecord.status !== TurnStatus.ACTIVE
    ) {
      Log.throw(
        "Cannot discard player card. Player turn record is invalid.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.discardedCard !== null) {
      Log.throw(
        "Cannot discard player card. Player turn record already contains a discarded card.",
        player.currentTurnRecord,
      );
    }

    const playerCardSet: PlayerCard[] =
      playerCard.card.suit === CardSuit.BLOOD
        ? player.currentBloodCards
        : player.currentSandCards;
    if (playerCardSet.length <= 1) {
      Log.throw(
        "Cannot discard player card. Associated player card set does not contain enough cards.",
        player,
      );
    }

    const playerCardIndex: number = playerCardSet.indexOf(playerCard);
    if (playerCardIndex === -1) {
      Log.throw(
        "Cannot discard player card. Player card does not exist in associated player card set.",
        playerCard,
      );
    }

    const discardSet: Card[] =
      playerCard.card.suit === CardSuit.BLOOD
        ? session.bloodDiscard
        : session.sandDiscard;
    playerCardSet.splice(playerCardIndex, 1);
    discardSet.unshift(playerCard.card);
    player.currentTurnRecord.discardedCard = playerCard;
    player.currentTurnRecord.status = TurnStatus.COMPLETED;
  }

  public static drawPlayerCard(
    session: Session,
    player: Player,
    drawSource: Exclude<PlayerCardSource, PlayerCardSource.DEALT>,
  ): void {
    DataController.validateSessionPlayer(session, player);

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

  public static async endTurn(session: Session): Promise<void> {
    const currentPlayer: Player = session.players[session.currentPlayerIndex];
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
      session.currentPlayerIndex === session.players.length - 1;
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

  public static finalizePlayerCards(session: Session, player: Player): void {
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

  public static generatePlayerCardDieRollValues(
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

  public static getFinalCardValue(
    primaryPlayerCard: PlayerCard,
    secondaryPlayerCard: PlayerCard | null = null,
  ): number {
    switch (primaryPlayerCard.card.type) {
      case CardType.IMPOSTER:
        if (primaryPlayerCard.dieRollValues.length !== 1) {
          Log.throw(
            "Cannot get final card value. Imposter player card does not contain exactly one die roll value.",
            primaryPlayerCard,
          );
        }
        return primaryPlayerCard.dieRollValues[0];
      case CardType.NUMBER:
        return primaryPlayerCard.card.value;
      case CardType.SYLOP:
        return secondaryPlayerCard !== null
          ? this.getFinalCardValue(secondaryPlayerCard)
          : 0;
      default:
        Log.throw(
          "Cannot get final card value. Unknown player card type.",
          primaryPlayerCard,
        );
    }
  }

  public static setPlayerCardDieRollValue(
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

  public static setPlayerTurnAction(
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

  public static standPlayer(session: Session, player: Player): void {
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

  public static async startGame(session: Session): Promise<void> {
    if (session.status !== SessionStatus.PENDING) {
      Log.throw(
        "Cannot start game. Session is not currently pending.",
        session,
      );
    }
    if (session.players.length <= 1) {
      Log.throw("Cannot start game. Player count is too low.", session);
    }

    session.startedAt = Date.now();
    session.status = SessionStatus.ACTIVE;
    new Random().shuffle(session.players);
    this.shuffleAndDealCards(session);
    await InteractionController.announceRoundStarted(session);
    await this.startTurn(session);
  }
}
