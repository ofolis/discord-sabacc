import {
  Random,
} from "random-js";
import {
  InteractionController,
  SessionController,
} from ".";
import {
  CardSuit,
  CardType,
  DrawSource,
  SessionStatus,
} from "../enums";
import {
  Card,
  HandResult,
  PlayerState,
  SessionState,
  TurnHistoryEntry,
} from "../types";
import {
  Utils,
} from "../utils";

// TODO: optimize where possible; split longer methods into their parts (helpers)
export class GameController {
  private static async endGame(
    session: SessionState,
  ): Promise<void> {
    session.status = SessionStatus.COMPLETED;
    SessionController.saveSession(session);
    await InteractionController.announceGameEnded(session);
  }

  private static async endHand(
    session: SessionState,
  ): Promise<void> {
    const partialHandResults: Pick<HandResult, "bloodCard" | "bloodCardValue" | "cardDifference" | "lowestCardValue" | "playerIndex" | "sandCard" | "sandCardValue">[] = [
    ];
    for (const player of session.players) {
      if (!player.isEliminated) {
        SessionController.validatePlayerCardSets(player);
        if (player.currentBloodCards.length > 1) {
          throw new Error("Player ended the round with more than one blood card.");
        }
        if (player.currentSandCards.length > 1) {
          throw new Error("Player ended the round with more than one sand card.");
        }
        const bloodCard: Card = player.currentBloodCards[0];
        const sandCard: Card = player.currentSandCards[0];
        const bloodCardValue: number = this.getFinalCardValue(
          bloodCard,
          sandCard,
          player,
        );
        const sandCardValue: number = this.getFinalCardValue(
          sandCard,
          bloodCard,
          player,
        );
        partialHandResults.push({
          "bloodCard": bloodCard,
          "bloodCardValue": bloodCardValue,
          "cardDifference": Math.abs(bloodCardValue - sandCardValue),
          "lowestCardValue": bloodCardValue <= sandCardValue ? bloodCardValue : sandCardValue,
          "playerIndex": session.players.indexOf(player),
          "sandCard": sandCard,
          "sandCardValue": sandCardValue,
        });
      }
    }
    partialHandResults.sort((a, b) => this.handResultSort(
      a,
      b,
    ));
    let currentRankIndex: number = 0;
    const handResults: HandResult[] = partialHandResults.map((
      partialHandResult,
      index,
    ) => {
      const isSabacc: boolean = partialHandResult.bloodCardValue === partialHandResult.sandCardValue;
      const isTiedWithPrevious: boolean = index !== 0 && this.handResultSort(
        partialHandResult,
        partialHandResults[index - 1],
      ) === 0 ? true : false;
      if (!isTiedWithPrevious) {
        currentRankIndex++;
      }
      let tokenLossTotal: number;
      if (isSabacc) {
        if (currentRankIndex === 0) {
          tokenLossTotal = 0;
        } else {
          tokenLossTotal = 1;
        }
      } else {
        tokenLossTotal = partialHandResult.cardDifference;
      }
      return {
        ...partialHandResult,
        "rankIndex": currentRankIndex,
        "tokenLossTotal": tokenLossTotal,
      };
    });
    let remainingPlayerTotal: number = 0;
    for (const handResult of handResults) {
      const player: PlayerState = session.players[handResult.playerIndex];
      if (handResult.tokenLossTotal >= player.currentTokenTotal) {
        player.currentTokenTotal = 0;
        player.isEliminated = true;
      } else {
        player.currentTokenTotal -= handResult.tokenLossTotal;
        remainingPlayerTotal++;
      }
      player.currentSpentTokenTotal = 0;
      player.handResults.push(handResult);
    }
    SessionController.saveSession(session);
    await InteractionController.announceHandEnded(session);
    if (remainingPlayerTotal <= 1) {
      await this.endGame(session);
    }
  }

  private static async endRound(
    session: SessionState,
  ): Promise<void> {
    const isGameRound: boolean = session.currentRoundIndex < 3;
    if (isGameRound) {
      session.currentRoundIndex += 1;
    } else {
      session.currentRoundIndex = 0;
    }
    SessionController.saveSession(session);
    if (!isGameRound) {
      await this.endHand(session);
    }
    if (session.status === SessionStatus.ACTIVE) {
      await InteractionController.announceRoundStarted(session);
    }
  }

  private static getFinalCardValue(
    primaryCard: Card,
    secondaryCard: Card,
    player: PlayerState,
  ): number {
    switch (primaryCard.type) {
      case CardType.IMPOSTER:
        return SessionController.getPlayerPendingImposterValue(
          player,
          primaryCard.suit,
        );
      case CardType.NUMBER:
        return primaryCard.value;
      case CardType.SYLOP:
        switch (secondaryCard.type) {
          case CardType.IMPOSTER:
            return SessionController.getPlayerPendingImposterValue(
              player,
              secondaryCard.suit,
            );
          case CardType.NUMBER:
            return secondaryCard.value;
          case CardType.SYLOP:
            return 0;
          default:
            throw new Error("Unknown secondary card type.");
        }
      default:
        throw new Error("Unknown primary card type.");
    }
  }

  private static handResultSort(
    firstResult: Pick<HandResult, "cardDifference" | "lowestCardValue">,
    secondResult: Pick<HandResult, "cardDifference" | "lowestCardValue">,
  ): -1 | 0 | 1 {
    const differenceComparison: number = firstResult.cardDifference - secondResult.cardDifference;
    if (differenceComparison !== 0) {
      return Math.sign(differenceComparison) as -1 | 0 | 1;
    }
    const valueComparison: number = firstResult.lowestCardValue - secondResult.lowestCardValue;
    return Math.sign(valueComparison) as -1 | 0 | 1;
  }

  private static shuffleAndDealCards(
    session: SessionState,
  ): void {
    const random: Random = new Random();
    session.bloodDeck.push(...session.bloodDiscard);
    session.bloodDiscard.length = 0; // Empty the array
    session.sandDeck.push(...session.sandDiscard);
    session.sandDiscard.length = 0; // Empty the array
    for (const player of session.players) {
      session.bloodDeck.push(...player.currentBloodCards);
      player.currentBloodCards.length = 0; // Empty the array
      session.sandDeck.push(...player.currentSandCards);
      player.currentSandCards.length = 0; // Empty the array
    }
    random.shuffle(session.bloodDeck);
    random.shuffle(session.sandDeck);
    for (const player of session.players) {
      player.currentBloodCards.push(Utils.removeTopArrayItem(session.bloodDeck));
      player.currentSandCards.push(Utils.removeTopArrayItem(session.sandDeck));
    }
    session.bloodDiscard.push(Utils.removeTopArrayItem(session.bloodDeck));
    session.sandDiscard.push(Utils.removeTopArrayItem(session.sandDeck));
    SessionController.saveSession(session);
  }

  private static async startTurn(
    session: SessionState,
  ): Promise<void> {
    await InteractionController.announceTurnStarted(session);
  }

  public static discardPlayerCard(
    session: SessionState,
    player: PlayerState,
    card: Card,
  ): void {
    SessionController.validateSessionPlayer(
      session,
      player,
    );
    SessionController.validatePlayerCard(
      player,
      card,
    );
    if (player.pendingDiscard === null) {
      throw new Error("Player does not have a pending discard.");
    }
    if (card.suit !== player.pendingDiscard.cardSuit) {
      throw new Error("Discard card suit does not match pending discard suit.");
    }
    const playerCardSet: Card[] = card.suit === CardSuit.BLOOD ? player.currentBloodCards : player.currentSandCards;
    const playerCardIndex: number = playerCardSet.indexOf(card);
    if (playerCardIndex === -1) {
      throw new Error("Player does not contain requested discard card.");
    }
    playerCardSet.splice(
      playerCardIndex,
      1,
    );
    if (card.suit === CardSuit.BLOOD) {
      session.bloodDiscard.unshift(card);
    } else {
      session.sandDiscard.unshift(card);
    }
    player.pendingDiscard = null;
    SessionController.saveSession(session);
  }

  public static drawPlayerCard(
    session: SessionState,
    player: PlayerState,
    drawSource: DrawSource,
  ): void {
    SessionController.validateSessionPlayer(
      session,
      player,
    );
    if (player.pendingDiscard !== null) {
      throw new Error("Player cannot draw while pending discard exists.");
    }
    if (player.currentSpentTokenTotal >= player.currentTokenTotal) {
      throw new Error("Player does not have tokens to spend.");
    }
    player.currentSpentTokenTotal++;
    let card: Card;
    switch (drawSource) {
      case DrawSource.BLOOD_DECK:
        if (session.bloodDeck.length === 0) {
          throw new Error("Cannot draw from empty blood deck.");
        }
        card = Utils.removeTopArrayItem(session.bloodDeck);
        break;
      case DrawSource.BLOOD_DISCARD:
        if (session.bloodDiscard.length === 0) {
          throw new Error("Cannot draw from empty blood discard.");
        }
        card = Utils.removeTopArrayItem(session.bloodDiscard);
        break;
      case DrawSource.SAND_DECK:
        if (session.sandDeck.length === 0) {
          throw new Error("Cannot draw from empty sand deck.");
        }
        card = Utils.removeTopArrayItem(session.sandDeck);
        break;
      case DrawSource.SAND_DISCARD:
        if (session.sandDiscard.length === 0) {
          throw new Error("Cannot draw from empty sand discard.");
        }
        card = Utils.removeTopArrayItem(session.sandDiscard);
        break;
      default:
        throw new Error("Unknown draw source.");
    }
    if (card.suit === CardSuit.BLOOD) {
      player.currentBloodCards.push(card);
    } else {
      player.currentSandCards.push(card);
    }
    player.pendingDiscard = {
      "cardSuit": card.suit,
      "drawSource": drawSource,
    };
    SessionController.saveSession(session);
  }

  public static async endTurn(
    session: SessionState,
    turnHistoryEntry: TurnHistoryEntry,
  ): Promise<void> {
    const currentPlayer: PlayerState = session.players[session.currentPlayerIndex];
    const isLastPlayer: boolean = session.currentPlayerIndex === session.players.length - 1;
    currentPlayer.turnHistory.push(turnHistoryEntry);
    if (isLastPlayer) {
      session.currentPlayerIndex = 0;
    } else {
      session.currentPlayerIndex += 1;
    }
    SessionController.saveSession(session);
    await InteractionController.announceTurnEnded(session);
    if (isLastPlayer) {
      await this.endRound(session);
    }
    if (session.status === SessionStatus.ACTIVE) {
      await this.startTurn(session);
    }
  }

  public static async startGame(
    session: SessionState,
  ): Promise<void> {
    const random: Random = new Random();
    if (session.status !== SessionStatus.PENDING) {
      throw new Error("Cannot start game on non-pending session.");
    }
    if (session.players.length <= 1) {
      throw new Error("Game did not have enough players to start.");
    }
    session.startedAt = Date.now();
    session.status = SessionStatus.ACTIVE;
    random.shuffle(session.players);
    this.shuffleAndDealCards(session);
    SessionController.saveSession(session);
    await this.startTurn(session);
  }
}
