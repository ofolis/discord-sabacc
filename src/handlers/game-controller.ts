import {
  MessageController,
} from ".";
import {
  Discord,
} from "../discord";
import {
  SessionStatus,
} from "../enums";
import {
  SessionState,
} from "../types";
import {
  Utils,
} from "../utils";

export class GameController {
  public static async tableStartTurn(
    session: SessionState,
  ): Promise<void> {
    if (session.status !== SessionStatus.ACTIVE) {
      throw new Error("Game turns may only begin on active sessions.");
    }
    const contentLines: string[] = [
      `# <@${session.players[session.currentPlayerIndex].id}>'s Turn`,
      `**Round:** \`${(session.currentRoundIndex + 1).toString()}\`  |  **Turn:** \`${(session.currentTurnIndex + 1).toString()}\``,
      "## Table",
      MessageController.formatTableDetailMessage(session),
      "## Players",
      MessageController.formatPlayersDetailMessage(session),
      "",
      "-# Use the **/play** command to play your turn.",
      "-# Use the **/info** command to view your hand and see game info.",
    ];
    // Send new turn message
    await Discord.sendMessage(
      session.channelId,
      Utils.linesToString(contentLines),
    );
  }
}
