import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CollectorFilter,
  CommandInteraction,
  ComponentType,
  InteractionResponse,
  MessageComponentInteraction,
} from "discord.js";
import {
  SessionController,
} from "..";
import {
  SessionStatus,
} from "../../enums";
import type {
  Command,
  SessionState,
} from "../../types";

export const command: Command = {
  "name": "new",
  "description": "Start a new game.",
  "isGlobal": false,
  "isGuild": true,
  "execute": async(interaction: CommandInteraction): Promise<void> => {
    if (interaction.guildId === null) {
      return;
    }
    const session: SessionState | null = SessionController.loadSession(
      interaction.guildId,
      interaction.channelId,
    );
    if (session === null || session.status === SessionStatus.COMPLETED) {
      SessionController.createSession(
        interaction.guildId,
        interaction.channelId,
        interaction.user,
        6,
      );
    } else {
      const confirmButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId("endGame")
        .setLabel("End Game")
        .setStyle(ButtonStyle.Danger);
      const cancelButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary);
      const row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          confirmButton,
          cancelButton,
        );
      const interactionResponse: InteractionResponse = await interaction.reply({
        "content": "A game is currently active in this channel. Do you want to end it and start a new game?",
        "components": [
          row,
        ],
        "ephemeral": true,
      });
      const collectorFilter: CollectorFilter<[MessageComponentInteraction]> = (i) =>
        i.user.id === interaction.user.id && i.componentType === ComponentType.Button;
      try {
        const buttonInteraction: ButtonInteraction = await interactionResponse.awaitMessageComponent({
          "filter": collectorFilter,
          "time": 60000, // 1 minute
        }) as ButtonInteraction;
        await interaction.deleteReply();
        if (buttonInteraction.customId === "endGame") {
          SessionController.createSession(
            interaction.guildId,
            interaction.channelId,
            interaction.user,
            6,
          );
        }
      } catch (_: unknown) {
        // On timeout
        await interaction.deleteReply();
      }
    }
  },
};
