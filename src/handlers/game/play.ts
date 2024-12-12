import {
  Messaging,
  Session,
} from ".";
import {
  GameSessionStatus,
} from "../../enums";
import {
  GameSession,
} from "../../types";

export class Play {
  public static async startTurn(guildId: string, channelId: string): Promise<void> {
    const session: GameSession = Session.load(
      guildId,
      channelId,
    );
    if (session.status !== GameSessionStatus.ACTIVE) {
      throw new Error("Game turns may only begin on active sessions.");
    }
    // Send new turn message
    await Messaging.sendMessage(
      channelId,
      Messaging.getTurnMessageContent(session),
    );
  }
}
