import {
  InteractionController,
} from ".";
import {
  SessionStatus,
} from "../enums";
import {
  SessionState,
} from "../types";

export class GameController {
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
