import {
  InteractionController,
} from ".";
import {
  SessionStatus,
} from "../enums";
import {
  Card,
  SessionState,
} from "../types";

export class GameController {
  public static drawTopCard(deck: Card[]): Card {
    const drawnCard: Card | undefined = deck.shift();
    if (drawnCard === undefined) {
      throw new Error("Cannot draw a card from an empty deck.");
    }
    return drawnCard;
  }

  public static async startTurn(session: SessionState): Promise<void> {
    if (session.status !== SessionStatus.ACTIVE) {
      throw new Error("Game turns may only begin on active sessions.");
    }
    // Send new turn message
    await InteractionController.sendPublicMessage(
      session.channelId,
      InteractionController.getTurnMessage(session),
    );
  }
}
