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
  TurnStatus,
} from "../enums";
import {
  Log,
} from "../log";
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
    const partialHandResults: Pick<HandResult, "bloodCard" | "bloodCardValue" | "cardDifference" | "lowestCardValue" | "playerIndex" | "sandCard" | "sandCardValue" | "spentTokenTotal">[] = [
    ];
    for (const player of session.players) {
      if (!player.isEliminated) {
        SessionController.validatePlayerCardSets(player);
        if (player.currentBloodCards.length > 1) {
          Log.throw(
            "Player ended the round with more than one blood card.",
            player,
          );
        }
        if (player.currentSandCards.length > 1) {
          Log.throw(
            "Player ended the round with more than one sand card.",
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
        partialHandResults.push({
          "bloodCard": bloodPlayerCard,
          "bloodCardValue": bloodCardValue,
          "cardDifference": Math.abs(bloodCardValue - sandCardValue),
          "lowestCardValue": bloodCardValue <= sandCardValue ? bloodCardValue : sandCardValue,
          "playerIndex": session.players.indexOf(player),
          "sandCard": sandPlayerCard,
          "sandCardValue": sandCardValue,
          "spentTokenTotal": player.currentSpentTokenTotal,
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
      if (index !== 0 && !isTiedWithPrevious) {
        currentRankIndex++;
      }
      let tokenPenaltyTotal: number;
      let tokenLossTotal: number;
      if (isSabacc) {
        if (currentRankIndex === 0) {
          tokenPenaltyTotal = 0;
          tokenLossTotal = 0;
        } else {
          tokenPenaltyTotal = 1;
          tokenLossTotal = partialHandResult.spentTokenTotal + tokenPenaltyTotal;
        }
      } else {
        tokenPenaltyTotal = partialHandResult.cardDifference;
        tokenLossTotal = partialHandResult.spentTokenTotal + partialHandResult.cardDifference;
      }
      return {
        ...partialHandResult,
        "rankIndex": currentRankIndex,
        "tokenLossTotal": tokenLossTotal,
        "tokenPenaltyTotal": tokenPenaltyTotal,
      };
    });
    let remainingPlayerTotal: number = 0;
    for (const handResult of handResults) {
      const player: PlayerState = session.players[handResult.playerIndex];
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
    }
    session.handResults.push(handResults);
    SessionController.saveSession(session);
    await InteractionController.announceHandEnded(session);
    if (remainingPlayerTotal <= 1) {
      await this.endGame(session);
    }
    if (session.status === SessionStatus.ACTIVE) {
      session.currentHandIndex += 1;
      this.iterateStartingPlayer(session);
      this.shuffleAndDealCards(session);
      SessionController.saveSession(session);
      await InteractionController.announceHandStarted(session);
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
          Log.throw(
            "Primary imposter player card does not contain any die roll values.",
            primaryPlayerCard,
          );
        } else if (primaryPlayerCard.dieRollValues.length > 1) {
          Log.throw(
            "Primary imposter player card contains more than one die roll value.",
            primaryPlayerCard,
          );
        }
        return primaryPlayerCard.dieRollValues[0];
      case CardType.NUMBER:
        return primaryPlayerCard.card.value;
      case CardType.SYLOP:
        switch (secondaryPlayerCard.card.type) {
          case CardType.IMPOSTER:
            if (secondaryPlayerCard.dieRollValues.length === 0) {
              Log.throw(
                "Secondary imposter player card does not contain any die roll values.",
                secondaryPlayerCard,
              );
            } else if (secondaryPlayerCard.dieRollValues.length > 1) {
              Log.throw(
                "Secondary imposter player card contains more than one die roll value.",
                secondaryPlayerCard,
              );
            }
            return secondaryPlayerCard.dieRollValues[0];
          case CardType.NUMBER:
            return secondaryPlayerCard.card.value;
          case CardType.SYLOP:
            return 0;
          default:
            Log.throw(
              "Unknown secondary player card type.",
              secondaryPlayerCard,
            );
        }
      // TODO: fix this, why is it flagging this?
      // eslint-disable-next-line no-fallthrough -- incorrect flagging
      default:
        Log.throw(
          "Unknown primary player card type.",
          primaryPlayerCard,
        );
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

  private static iterateStartingPlayer(
    session: SessionState,
  ): void {
    session.players.push(session.players.splice(
      0,
      1,
    )[0]);
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
  }

  private static async startTurn(
    session: SessionState,
  ): Promise<void> {
    for (const player of session.players) {
      player.currentTurnRecord = null;
    }
    SessionController.saveSession(session);
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
    if (player.currentTurnRecord === null) {
      Log.throw(
        "Player turn record does not exist.",
        player,
      );
    }
    if (player.currentTurnRecord.action !== TurnAction.DRAW) {
      Log.throw(
        "Player turn action is not draw.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.status !== TurnStatus.ACTIVE) {
      Log.throw(
        "Player turn record is not active.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.discardedCard !== null) {
      Log.throw(
        "Player already had a discarded card.",
        player.currentTurnRecord,
      );
    }
    const bloodDiscardIsValid: boolean = player.currentBloodCards.length > 1;
    const sandDiscardIsValid: boolean = player.currentSandCards.length > 1;
    if (!bloodDiscardIsValid && !sandDiscardIsValid) {
      Log.throw(
        "Player does not have a pending discard.",
        player,
      );
    }
    if (playerCard.card.suit === CardSuit.BLOOD && !bloodDiscardIsValid) {
      Log.throw(
        "Player blood discard is invalid.",
        playerCard,
      );
    }
    if (playerCard.card.suit === CardSuit.SAND && !sandDiscardIsValid) {
      Log.throw(
        "Player sand discard is invalid.",
        playerCard,
      );
    }
    const playerCardSet: PlayerCard[] = playerCard.card.suit === CardSuit.BLOOD ? player.currentBloodCards : player.currentSandCards;
    const discardSet: Card[] = playerCard.card.suit === CardSuit.BLOOD ? session.bloodDiscard : session.sandDiscard;
    const playerCardIndex: number = playerCardSet.indexOf(playerCard);
    if (playerCardIndex === -1) {
      Log.throw(
        "Player card was validated but did not exist in set.",
        playerCard,
      );
    }
    playerCardSet.splice(
      playerCardIndex,
      1,
    );
    discardSet.unshift(playerCard.card);
    player.currentTurnRecord.discardedCard = playerCard;
    player.currentTurnRecord.status = TurnStatus.COMPLETED;
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
    if (player.currentTurnRecord === null) {
      Log.throw(
        "Player turn record does not exist.",
        player,
      );
    }
    if (player.currentTurnRecord.action !== TurnAction.DRAW) {
      Log.throw(
        "Player turn action is not draw.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.status !== TurnStatus.ACTIVE) {
      Log.throw(
        "Player turn record is not active.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.drawnCard !== null) {
      Log.throw(
        "Player already had a drawn card.",
        player.currentTurnRecord,
      );
    }
    if (player.currentSpentTokenTotal >= player.currentTokenTotal) {
      Log.throw(
        "Player does not have tokens to spend.",
        player.currentTurnRecord,
      );
    }
    player.currentSpentTokenTotal++;
    let drawSourceSet: Card[];
    let playerCardSet: PlayerCard[];
    switch (drawSource) {
      case PlayerCardSource.BLOOD_DECK:
        if (session.bloodDeck.length === 0) {
          Log.throw(
            "Cannot draw from empty blood deck.",
            session,
          );
        }
        drawSourceSet = session.bloodDeck;
        playerCardSet = player.currentBloodCards;
        break;
      case PlayerCardSource.BLOOD_DISCARD:
        if (session.bloodDiscard.length === 0) {
          Log.throw(
            "Cannot draw from empty blood discard.",
            session,
          );
        }
        drawSourceSet = session.bloodDiscard;
        playerCardSet = player.currentBloodCards;
        break;
      case PlayerCardSource.SAND_DECK:
        if (session.sandDeck.length === 0) {
          Log.throw(
            "Cannot draw from empty sand deck.",
            session,
          );
        }
        drawSourceSet = session.sandDeck;
        playerCardSet = player.currentSandCards;
        break;
      case PlayerCardSource.SAND_DISCARD:
        if (session.sandDiscard.length === 0) {
          Log.throw(
            "Cannot draw from empty sand discard.",
            session,
          );
        }
        drawSourceSet = session.sandDiscard;
        playerCardSet = player.currentSandCards;
        break;
      default:
        Log.throw(
          "Unknown draw source.",
          drawSource,
        );
    }
    const card: Card = Utils.removeTopArrayItem(drawSourceSet);
    const playerCard: PlayerCard = {
      "card": card,
      "dieRollValues": [
      ],
      "source": drawSource,
    };
    playerCardSet.push(playerCard);
    player.currentTurnRecord.drawnCard = playerCard;
    SessionController.saveSession(session);
  }

  public static async endTurn(
    session: SessionState,
  ): Promise<void> {
    const currentPlayer: PlayerState = session.players[session.currentPlayerIndex];
    if (currentPlayer.currentTurnRecord === null) {
      Log.throw(
        "Player turn record does not exist.",
        session,
      );
    }
    if (currentPlayer.currentTurnRecord.status !== TurnStatus.COMPLETED) {
      Log.throw(
        "Player turn record is not completed.",
        currentPlayer.currentTurnRecord,
      );
    }
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

  public static generatePlayerCardDieRollValues(
    session: SessionState,
    player: PlayerState,
    playerCard: PlayerCard,
  ): void {
    SessionController.validateSessionPlayer(
      session,
      player,
    );
    SessionController.validatePlayerCard(
      player,
      playerCard,
    );
    if (playerCard.dieRollValues.length !== 0) {
      Log.throw(
        "Die roll values already exist on player card.",
        playerCard,
      );
    }
    const random: Random = new Random();
    playerCard.dieRollValues.push(random.die(6));
    playerCard.dieRollValues.push(random.die(6));
    SessionController.saveSession(session);
  }

  public static async revealCards(
    session: SessionState,
    player: PlayerState,
  ): Promise<void> {
    SessionController.validateSessionPlayer(
      session,
      player,
    );
    if (player.currentTurnRecord === null) {
      Log.throw(
        "Player turn record does not exist.",
        player,
      );
    }
    if (player.currentTurnRecord.action !== TurnAction.REVEAL) {
      Log.throw(
        "Player turn action is not reveal.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.status !== TurnStatus.ACTIVE) {
      Log.throw(
        "Player turn record is not active.",
        player.currentTurnRecord,
      );
    }
    if (player.currentBloodCards[0].card.type === CardType.IMPOSTER || player.currentSandCards[0].card.type === CardType.IMPOSTER) {
      await InteractionController.announceCardsRevealed(session);
    }
  }

  public static setPlayerCardDieRollValue(
    session: SessionState,
    player: PlayerState,
    playerCard: PlayerCard,
    dieValue: number,
  ): void {
    SessionController.validateSessionPlayer(
      session,
      player,
    );
    SessionController.validatePlayerCard(
      player,
      playerCard,
    );
    if (!playerCard.dieRollValues.includes(dieValue)) {
      Log.throw(
        "Die roll value does not exist on player card.",
        playerCard,
      );
    }
    Utils.emptyArray(playerCard.dieRollValues);
    playerCard.dieRollValues.push(dieValue);
    SessionController.saveSession(session);
  }

  public static setPlayerTurnAction(
    session: SessionState,
    player: PlayerState,
    turnAction: TurnAction | null,
  ): void {
    SessionController.validateSessionPlayer(
      session,
      player,
    );
    switch (turnAction) {
      case TurnAction.DRAW:
        player.currentTurnRecord = {
          "action": TurnAction.DRAW,
          "discardedCard": null,
          "drawnCard": null,
          "status": TurnStatus.ACTIVE,
        };
        break;
      case TurnAction.REVEAL:
        player.currentTurnRecord = {
          "action": TurnAction.REVEAL,
          "status": TurnStatus.ACTIVE,
        };
        break;
      case TurnAction.STAND:
        player.currentTurnRecord = {
          "action": TurnAction.STAND,
          "status": TurnStatus.ACTIVE,
        };
        break;
      case null:
        player.currentTurnRecord = null;
        break;
      default:
        Log.throw(
          "Unknown turn action.",
          turnAction,
        );
    }
    SessionController.saveSession(session);
  }

  public static standPlayer(
    session: SessionState,
    player: PlayerState,
  ): void {
    SessionController.validateSessionPlayer(
      session,
      player,
    );
    if (player.currentTurnRecord === null) {
      Log.throw(
        "Player turn record does not exist.",
        player,
      );
    }
    if (player.currentTurnRecord.action !== TurnAction.STAND) {
      Log.throw(
        "Player turn action is not stand.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.status !== TurnStatus.ACTIVE) {
      Log.throw(
        "Player turn record is not active.",
        player.currentTurnRecord,
      );
    }
    player.currentTurnRecord.status = TurnStatus.COMPLETED;
    SessionController.saveSession(session);
  }

  public static async startGame(
    session: SessionState,
  ): Promise<void> {
    const random: Random = new Random();
    if (session.status !== SessionStatus.PENDING) {
      Log.throw(
        "Cannot start game on non-pending session.",
        session,
      );
    }
    if (session.players.length <= 1) {
      Log.throw(
        "Game did not have enough players to start.",
        session,
      );
    }
    session.startedAt = Date.now();
    session.status = SessionStatus.ACTIVE;
    random.shuffle(session.players);
    this.shuffleAndDealCards(session);
    SessionController.saveSession(session);
    await this.startTurn(session);
  }

  public static submitCards(
    session: SessionState,
    player: PlayerState,
  ): void {
    SessionController.validateSessionPlayer(
      session,
      player,
    );
    if (player.currentTurnRecord === null) {
      Log.throw(
        "Player turn record does not exist.",
        player,
      );
    }
    if (player.currentTurnRecord.action !== TurnAction.REVEAL) {
      Log.throw(
        "Player turn action is not reveal.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.status !== TurnStatus.ACTIVE) {
      Log.throw(
        "Player turn record is not active.",
        player.currentTurnRecord,
      );
    }
    player.currentTurnRecord.status = TurnStatus.COMPLETED;
    SessionController.saveSession(session);
  }
}
