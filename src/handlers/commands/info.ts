import {
  MessageController,
  SessionController,
} from "..";
import type {
  DiscordCommandInteraction,
} from "../../discord";
import {
  SessionStatus,
} from "../../enums";
import type {
  Command,
  PlayerState,
  SessionState,
} from "../../types";

export const command: Command = {
  "name": "info",
  "description": "View your hand and see game info.",
  "isGlobal": false,
  "isGuild": true,
  "execute": async(interaction: DiscordCommandInteraction): Promise<void> => {
    if (interaction.guildId === null) {
      return;
    }
    const session: SessionState | null = SessionController.loadSession(
      interaction.guildId,
      interaction.channelId,
    );
    if (session === null || session.status !== SessionStatus.ACTIVE) {
      await interaction.reply({
        "content": "There is no active game in this channel.",
        "ephemeral": true,
      });
    } else {
      const player: PlayerState = SessionController.getSessionPlayer(
        session,
        interaction.user.id,
      );
      const isUserTurn: boolean = session.players[session.currentPlayerIndex].id === interaction.user.id;
      const messageLines: string[] = [
        isUserTurn ? "# Your Turn" : `# ${session.players[session.currentPlayerIndex].username}'s Turn`,
        `**Round:** \`${(session.currentRoundIndex + 1).toString()}\`  |  **Turn:** \`${(session.currentTurnIndex + 1).toString()}\``,
        "## Table",
        MessageController.formatTableDetailMessage(session),
        "## Players",
        MessageController.formatPlayersDetailMessage(session),
        "## Your Hand",
        MessageController.formatPlayerHandMessage(player),
      ];
      if (isUserTurn) {
        messageLines.push("");
        messageLines.push("-# Use the **/play** command to take your turn.");
      }
      await interaction.reply({
        "content": MessageController.linesToString(messageLines),
        "ephemeral": true,
      });
    }
  },
};
