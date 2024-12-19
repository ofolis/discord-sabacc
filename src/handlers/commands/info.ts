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
      await interaction.reply({
        "content": InteractionController.getInfoMessage(
          session,
          interaction.user.id,
        ),
        "ephemeral": true,
      });
    }
  },
};
