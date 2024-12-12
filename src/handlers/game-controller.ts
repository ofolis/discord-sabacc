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
  public static removeTopCard(deck: Card[]): Card {
    const removedCard: Card | undefined = deck.shift();
    if (removedCard === undefined) {
      throw new Error("Cannot draw a card from an empty deck.");
    }
    return removedCard;
  }

  public static async startTurn(session: SessionState): Promise<void> {
    if (session.status !== SessionStatus.ACTIVE) {
      throw new Error("Game turns may only begin on active sessions.");
    }
    // Send new turn message
    await InteractionController.sendMessage(
      session.channelId,
      InteractionController.getTurnMessageContent(session),
    );
  }
}
