import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CollectorFilter,
  ComponentType,
  InteractionResponse,
  MessageComponentInteraction,
} from "discord.js";
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
        const drawButton: ButtonBuilder = new ButtonBuilder()
          .setCustomId("draw")
          .setLabel("Draw")
          .setStyle(ButtonStyle.Success);
        const standButton: ButtonBuilder = new ButtonBuilder()
          .setCustomId("stand")
          .setLabel("Stand")
          .setStyle(ButtonStyle.Primary);
        const cancelButton: ButtonBuilder = new ButtonBuilder()
          .setCustomId("cancel")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary);
        const actionRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            drawButton,
            standButton,
            cancelButton,
          );
        const messageLines: string[] = [
          "You!",
        ];
        const actionResponse: InteractionResponse = await interaction.reply({
          "content": InteractionController.messageLinesToString(messageLines),
          "components": [
            actionRow,
          ],
          "ephemeral": true,
        });
        try {
          const actionCollectorFilter: CollectorFilter<[MessageComponentInteraction]> = (i) =>
            i.user.id === interaction.user.id && i.componentType === ComponentType.Button;
          const actionButtonInteraction: ButtonInteraction = await actionResponse.awaitMessageComponent({
            "filter": actionCollectorFilter,
            "time": 60000, // 1 minute
          }) as ButtonInteraction;
          if (actionButtonInteraction.customId === "draw") {
            const sandDrawDraw: ButtonBuilder = new ButtonBuilder()
              .setCustomId("sandDrawDraw")
              .setLabel("🟨 Draw")
              .setStyle(ButtonStyle.Primary);
            const sandDiscardDraw: ButtonBuilder = new ButtonBuilder()
              .setCustomId("sandDiscardDraw")
              .setLabel("🟨 Discard")
              .setStyle(ButtonStyle.Primary);
            const bloodDrawDraw: ButtonBuilder = new ButtonBuilder()
              .setCustomId("bloodDrawDraw")
              .setLabel("🟥 Draw")
              .setStyle(ButtonStyle.Primary);
            const bloodDiscardDraw: ButtonBuilder = new ButtonBuilder()
              .setCustomId("bloodDiscardDraw")
              .setLabel("🟥 Discard")
              .setStyle(ButtonStyle.Primary);
            const drawRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                sandDrawDraw,
                sandDiscardDraw,
                bloodDrawDraw,
                bloodDiscardDraw,
                cancelButton,
              );
            const drawResponse: InteractionResponse = await actionButtonInteraction.reply({
              "content": "DRAW",
              "components": [
                drawRow,
              ],
              "ephemeral": true,
            });
            await actionResponse.delete();
            try {
              const drawCollectorFilter: CollectorFilter<[MessageComponentInteraction]> = (i) =>
                i.user.id === drawButtonInteraction.user.id && i.componentType === ComponentType.Button;
              const drawButtonInteraction: ButtonInteraction = await drawResponse.awaitMessageComponent({
                "filter": drawCollectorFilter,
                "time": 60000, // 1 minute
              }) as ButtonInteraction;
              if (drawButtonInteraction.customId === "sandDrawDraw") {
                await drawButtonInteraction.reply({
                  "content": "sandDrawDraw",
                  "ephemeral": true,
                });
              } else if (drawButtonInteraction.customId === "sandDiscardDraw") {
                await actionButtonInteraction.reply({
                  "content": "sandDiscardDraw",
                  "ephemeral": true,
                });
              }
              else if (drawButtonInteraction.customId === "bloodDrawDraw") {
                await actionButtonInteraction.reply({
                  "content": "bloodDrawDraw",
                  "ephemeral": true,
                });
              } else if (drawButtonInteraction.customId === "bloodDiscardDraw") {
                await actionButtonInteraction.reply({
                  "content": "bloodDiscardDraw",
                  "ephemeral": true,
                });
              }
              await drawResponse.delete();
            } catch (_: unknown) {
              // On timeout
              await drawResponse.delete();
            }
          } else if (actionButtonInteraction.customId === "stand") {
            await actionButtonInteraction.reply({
              "content": "STAND",
              "ephemeral": true,
            });
          }
        } catch (_: unknown) {
          // On timeout
          await actionResponse.delete();
        }
      }
    }
  },
};
