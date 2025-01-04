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
  PlayerCardSource,
  SessionStatus,
  TurnAction,
} from "../enums";
import {
  Card,
  HandResult,
  PlayerCard,
  PlayerState,
  SessionState,
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
        partialHandResults.push({
          "bloodCard": bloodPlayerCard,
          "bloodCardValue": bloodCardValue,
          "cardDifference": Math.abs(bloodCardValue - sandCardValue),
          "lowestCardValue": bloodCardValue <= sandCardValue ? bloodCardValue : sandCardValue,
          "playerIndex": session.players.indexOf(player),
          "sandCard": sandPlayerCard,
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
    primaryPlayerCard: PlayerCard,
    secondaryPlayerCard: PlayerCard,
  ): number {
    switch (primaryPlayerCard.card.type) {
      case CardType.IMPOSTER:
        if (primaryPlayerCard.dieRollValues.length === 0) {
          throw new Error("Primary imposter player card does not contain any die roll values.");
        } else if (primaryPlayerCard.dieRollValues.length > 1) {
          throw new Error("Primary imposter player card contains more than one die roll value.");
        }
        return primaryPlayerCard.dieRollValues[0];
      case CardType.NUMBER:
        return primaryPlayerCard.card.value;
      case CardType.SYLOP:
        switch (secondaryPlayerCard.card.type) {
          case CardType.IMPOSTER:
            if (secondaryPlayerCard.dieRollValues.length === 0) {
              throw new Error("Secondary imposter player card does not contain any die roll values.");
            } else if (secondaryPlayerCard.dieRollValues.length > 1) {
              throw new Error("Secondary imposter player card contains more than one die roll value.");
            }
            return secondaryPlayerCard.dieRollValues[0];
          case CardType.NUMBER:
            return secondaryPlayerCard.card.value;
          case CardType.SYLOP:
            return 0;
          default:
            throw new Error("Unknown secondary player card type.");
        }
      default:
        throw new Error("Unknown primary player card type.");
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
    Utils.emptyArray(session.bloodDiscard);
    session.sandDeck.push(...session.sandDiscard);
    Utils.emptyArray(session.sandDiscard);
    for (const player of session.players) {
      const bloodCards: Card[] = player.currentBloodCards.map((playerCard) => playerCard.card);
      session.bloodDeck.push(...bloodCards);
      Utils.emptyArray(player.currentBloodCards);
      const sandCards: Card[] = player.currentSandCards.map((playerCard) => playerCard.card);
      session.sandDeck.push(...sandCards);
      Utils.emptyArray(player.currentSandCards);
    }
    random.shuffle(session.bloodDeck);
    random.shuffle(session.sandDeck);
    for (const player of session.players) {
      const dealtBloodCard: Card = Utils.removeTopArrayItem(session.bloodDeck);
      const dealtSandCard: Card = Utils.removeTopArrayItem(session.sandDeck);
      player.currentBloodCards.push({
        "card": dealtBloodCard,
        "dieRollValues": [
        ],
        "source": PlayerCardSource.DEALT,
      });
      player.currentSandCards.push({
        "card": dealtSandCard,
        "dieRollValues": [
        ],
        "source": PlayerCardSource.DEALT,
      });
    }
    session.bloodDiscard.push(Utils.removeTopArrayItem(session.bloodDeck));
    session.sandDiscard.push(Utils.removeTopArrayItem(session.sandDeck));
    SessionController.saveSession(session);
  }

  private static async startTurn(
    session: SessionState,
  ): Promise<void> {
    for (const player of session.players) {
      player.currentTurnRecord = null;
    }
    await InteractionController.announceTurnStarted(session);
  }

  public static discardPlayerCard(
    session: SessionState,
    player: PlayerState,
    playerCard: PlayerCard,
  ): void {
    SessionController.validateSessionPlayer(
      session,
      player,
    );
    SessionController.validatePlayerCardSets(player);
    SessionController.validatePlayerCard(
      player,
      playerCard,
    );
    if (player.currentTurnRecord === null || player.currentTurnRecord.action !== TurnAction.DRAW || player.currentTurnRecord.discardedCard !== null) {
      throw new Error("Player turn record is invalid.");
    }
    const bloodDiscardIsValid: boolean = player.currentBloodCards.length > 1;
    const sandDiscardIsValid: boolean = player.currentSandCards.length > 1;
    if (!bloodDiscardIsValid && !sandDiscardIsValid) {
      throw new Error("Player does not have a pending discard.");
    }
    if (playerCard.card.suit === CardSuit.BLOOD && !bloodDiscardIsValid) {
      throw new Error("Player blood discard is invalid.");
    }
    if (playerCard.card.suit === CardSuit.SAND && !sandDiscardIsValid) {
      throw new Error("Player sand discard is invalid.");
    }
    const playerCardSet: PlayerCard[] = playerCard.card.suit === CardSuit.BLOOD ? player.currentBloodCards : player.currentSandCards;
    const discardSet: Card[] = playerCard.card.suit === CardSuit.BLOOD ? session.bloodDiscard : session.sandDiscard;
    const playerCardIndex: number = playerCardSet.indexOf(playerCard);
    if (playerCardIndex === -1) {
      throw new Error("Player card was validated but did not exist in set.");
    }
    playerCardSet.splice(
      playerCardIndex,
      1,
    );
    discardSet.unshift(playerCard.card);
    player.currentTurnRecord.discardedCard = playerCard;
    SessionController.saveSession(session);
  }

  public static drawPlayerCard(
    session: SessionState,
    player: PlayerState,
    drawSource: Exclude<PlayerCardSource, PlayerCardSource.DEALT>,
  ): void {
    SessionController.validateSessionPlayer(
      session,
      player,
    );
    if (player.currentTurnRecord !== null) {
      throw new Error("Player turn record already exists.");
    }
    if (player.currentSpentTokenTotal >= player.currentTokenTotal) {
      throw new Error("Player does not have tokens to spend.");
    }
    player.currentSpentTokenTotal++;
    let drawSourceSet: Card[];
    let playerCardSet: PlayerCard[];
    switch (drawSource) {
      case PlayerCardSource.BLOOD_DECK:
        if (session.bloodDeck.length === 0) {
          throw new Error("Cannot draw from empty blood deck.");
        }
        drawSourceSet = session.bloodDeck;
        playerCardSet = player.currentBloodCards;
        break;
      case PlayerCardSource.BLOOD_DISCARD:
        if (session.bloodDiscard.length === 0) {
          throw new Error("Cannot draw from empty blood discard.");
        }
        drawSourceSet = session.bloodDiscard;
        playerCardSet = player.currentBloodCards;
        break;
      case PlayerCardSource.SAND_DECK:
        if (session.sandDeck.length === 0) {
          throw new Error("Cannot draw from empty sand deck.");
        }
        drawSourceSet = session.sandDeck;
        playerCardSet = player.currentSandCards;
        break;
      case PlayerCardSource.SAND_DISCARD:
        if (session.sandDiscard.length === 0) {
          throw new Error("Cannot draw from empty sand discard.");
        }
        drawSourceSet = session.sandDiscard;
        playerCardSet = player.currentSandCards;
        break;
      default:
        throw new Error("Unknown draw source.");
    }
    const card: Card = Utils.removeTopArrayItem(drawSourceSet);
    const playerCard: PlayerCard = {
      "card": card,
      "dieRollValues": [
      ],
      "source": drawSource,
    };
    playerCardSet.push(playerCard);
    player.currentTurnRecord = {
      "action": TurnAction.DRAW,
      "discardedCard": null,
      "drawnCard": playerCard,
    };
    SessionController.saveSession(session);
  }

  public static async endTurn(
    session: SessionState,
  ): Promise<void> {
    const isLastPlayer: boolean = session.currentPlayerIndex === session.players.length - 1;
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

  public static rollImposterDie(): number {
    const random: Random = new Random();
    return random.die(6);
  }

  public static standPlayer(
    session: SessionState,
    player: PlayerState,
  ): void {
    SessionController.validateSessionPlayer(
      session,
      player,
    );
    if (player.currentTurnRecord !== null) {
      throw new Error("Player turn record already exists.");
    }
    player.currentTurnRecord = {
      "action": TurnAction.STAND,
    };
    SessionController.saveSession(session);
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
