import {
  InteractionController,
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
  SessionState,
} from "../../types";

export const command: Command = {
  "name": "play",
  "description": "Play your turn.",
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
      const messageLines: string[] = [
        "**There is no game currently active in this channel.**",
        "-# Use the **/new** command to start a new game.",
      ];
      await interaction.reply({
        "content": InteractionController.messageLinesToString(messageLines),
        "ephemeral": true,
      });
    } else {
      if (session.players[session.currentPlayerIndex].id !== interaction.user.id) {
        const messageLines: string[] = [
          `**It is currently ${session.players[session.currentPlayerIndex].username}'s turn.**`,
          "-# Use the **/info** command to view your hand and see game info.",
        ];
        await interaction.reply({
          "content": InteractionController.messageLinesToString(messageLines),
          "ephemeral": true,
        });
      } else {
        const messageLines: string[] = [
          "You!",
        ];
        await interaction.reply({
          "content": InteractionController.messageLinesToString(messageLines),
          "ephemeral": true,
        });
      }
    }
  },
};
