import {
  Random,
} from "random-js";
import {
  SessionController,
} from ".";
import {
  CardSuit,
  DrawSource,
  SessionStatus,
} from "../enums";
import {
  Card,
  PlayerState,
  SessionState,
} from "../types";
import {
  Utils,
} from "../utils";

export class GameController {
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

  public static endTurn(
    session: SessionState,
  ): void {
    if (session.status !== SessionStatus.ACTIVE) {
      throw new Error("Cannot end turn on non-active session.");
    }
    if (session.currentPlayerIndex === session.players.length - 1) {
      if (session.currentRoundIndex === 2) {
        // TODO: Score it here, and only shuffle/deal if it needs to be done
        this.shuffleAndDealCards(session);
        session.currentHandIndex += 1;
        session.currentRoundIndex = 0;
      } else {
        session.currentRoundIndex += 1;
      }
      session.currentPlayerIndex = 0;
    } else {
      session.currentPlayerIndex += 1;
    }
    SessionController.saveSession(session);
  }

  public static playerSpendToken(
    session: SessionState,
    player: PlayerState,
  ): void {
    if (player.currentUnspentTokenTotal <= 0) {
      throw new Error("Player does not have tokens to spend.");
    }
    player.currentUnspentTokenTotal -= 1;
    player.currentSpentTokenTotal += 1;
    SessionController.saveSession(session);
  }

  public static playerDiscardCard(
    session: SessionState,
    player: PlayerState,
    card: Card,
  ): void {
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
    SessionController.saveSession(session);
  }

  public static playerDrawCard(
    session: SessionState,
    player: PlayerState,
    drawSource: DrawSource,
  ): void {
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
    SessionController.saveSession(session);
  }

  public static playerHasPendingDiscard(player: PlayerState): boolean {
    return player.currentBloodCards.length > 1 || player.currentSandCards.length > 1;
  }

  public static startGame(
    session: SessionState,
  ): void {
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
  }
}
