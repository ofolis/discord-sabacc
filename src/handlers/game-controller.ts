import {
  InteractionController,
  SessionController,
} from ".";
import {
  CardSuit,
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
    cardSuit: CardSuit,
    useDiscard: boolean,
  ): void {
    const sessionCardSet: Card[] = cardSuit === CardSuit.BLOOD ? useDiscard ? session.bloodDiscard : session.bloodDeck : useDiscard ? session.sandDiscard : session.sandDeck;
    if (sessionCardSet.length === 0) {
      throw new Error("Cannot draw from empty session card set.");
    }
    const card: Card = Utils.removeTopArrayItem(sessionCardSet);
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

  public static async startGame(
    session: SessionState,
  ): Promise<void> {
    if (session.status !== SessionStatus.PENDING) {
      throw new Error("Cannot start game on non-pending session.");
    }
    if (session.players.length <= 1) {
      throw new Error("Game did not have enough players to start.");
    }
    session.players = Utils.shuffleArray(session.players);
    for (const player of session.players) {
      player.currentBloodCards.push(Utils.removeTopArrayItem(session.bloodDeck));
      player.currentSandCards.push(Utils.removeTopArrayItem(session.sandDeck));
    }
    session.bloodDiscard.push(Utils.removeTopArrayItem(session.bloodDeck));
    session.sandDiscard.push(Utils.removeTopArrayItem(session.sandDeck));
    session.startedAt = Date.now();
    session.status = SessionStatus.ACTIVE;
    SessionController.saveSession(session);
    await this.startHand(session);
  }

  public static async startHand(
    session: SessionState,
  ): Promise<void> {
    if (session.status !== SessionStatus.ACTIVE) {
      throw new Error("Cannot start hand on non-active session.");
    }
    await this.startRound(session);
  }

  public static async startRound(
    session: SessionState,
  ): Promise<void> {
    if (session.status !== SessionStatus.ACTIVE) {
      throw new Error("Cannot start round on non-active session.");
    }
    await this.startTurn(
      session,
    );
  }

  public static async startTurn(
    session: SessionState,
  ): Promise<void> {
    if (session.status !== SessionStatus.ACTIVE) {
      throw new Error("Cannot start turn on non-active session.");
    }
    await InteractionController.announceTurnStart(session);
  }
}
