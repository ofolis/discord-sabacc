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
        "content": MessageController.linesToString(messageLines),
        "ephemeral": true,
      });
    } else {
      if (session.players[session.currentPlayerIndex].id !== interaction.user.id) {
        const messageLines: string[] = [
          `**It is currently ${session.players[session.currentPlayerIndex].username}'s turn.**`,
          "-# Use the **/info** command to view your hand and see game info.",
        ];
        await interaction.reply({
          "content": MessageController.linesToString(messageLines),
          "ephemeral": true,
        });
      } else {
        const player: PlayerState = SessionController.getSessionPlayer(
          session,
          interaction.user.id,
        );
        const drawDisabled: boolean = player.currentUnplayedTokenTotal === 0 || (session.bloodDeck.length === 0 && session.bloodDiscard.length === 0 && session.sandDeck.length === 0 && session.sandDiscard.length === 0) ? true : false;
        const drawButton: ButtonBuilder = new ButtonBuilder()
          .setCustomId("draw")
          .setLabel("Draw")
          .setStyle(ButtonStyle.Success)
          .setDisabled(drawDisabled);
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
        const actionMessageLines: string[] = [
          `**Round:** \`${(session.currentRoundIndex + 1).toString()}\`  |  **Turn:** \`${(session.currentTurnIndex + 1).toString()}\``,
          "## Table",
          MessageController.formatTableDetailMessage(session),
          "## Your Hand",
          MessageController.formatPlayerHandMessage(player),
          "",
          "**Choose your turn action.**",
        ];
        if (drawDisabled) {
          actionMessageLines.push("-# **Draw** is disabled because you have no remaining tokens.");
        }
        const message: InteractionResponse = await interaction.reply({
          "components": [
            actionRow,
          ],
          "content": MessageController.linesToString(actionMessageLines),
          "ephemeral": true,
        });
        const collectorFilter: CollectorFilter<[MessageComponentInteraction]> = (i) => i.user.id === interaction.user.id;
        try {
          // Await the first button interaction
          const actionInteraction: ButtonInteraction = await message.awaitMessageComponent<ComponentType.Button>({
            "componentType": ComponentType.Button,
            "filter": collectorFilter,
            "time": 60000,
          });
          if (actionInteraction.customId === "draw") {
            const drawRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>();
            const drawMessageLines: string[] = [
              `**Round:** \`${(session.currentRoundIndex + 1).toString()}\`  |  **Turn:** \`${(session.currentTurnIndex + 1).toString()}\``,
              "## Table",
              MessageController.formatTableDetailMessage(session),
              "## Your Hand",
              MessageController.formatPlayerHandMessage(player),
              "",
              "**Choose a draw option.**",
            ];
            if (session.sandDiscard.length > 0) {
              const sandDiscardDraw: ButtonBuilder = new ButtonBuilder()
                .setCustomId("sandDiscardDraw")
                .setLabel(MessageController.formatCardString(session.sandDiscard[0]))
                .setStyle(ButtonStyle.Primary);
              drawRow.addComponents(sandDiscardDraw);
            } else {
              drawMessageLines.push("-# There is currently no sand discard to draw.");
            }
            if (session.bloodDiscard.length > 0) {
              const bloodDiscardDraw: ButtonBuilder = new ButtonBuilder()
                .setCustomId("bloodDiscardDraw")
                .setLabel(MessageController.formatCardString(session.bloodDiscard[0]))
                .setStyle(ButtonStyle.Primary);
              drawRow.addComponents(bloodDiscardDraw);
            } else {
              drawMessageLines.push("-# There is currently no blood discard to draw.");
            }
            if (session.sandDeck.length > 0) {
              const sandDeckDraw: ButtonBuilder = new ButtonBuilder()
                .setCustomId("sandDeckDraw")
                .setLabel("🟨?")
                .setStyle(ButtonStyle.Primary);
              drawRow.addComponents(sandDeckDraw);
            } else {
              drawMessageLines.push("-# There is currently no sand deck to draw.");
            }
            if (session.bloodDeck.length > 0) {
              const bloodDeckDraw: ButtonBuilder = new ButtonBuilder()
                .setCustomId("bloodDeckDraw")
                .setLabel("🟥?")
                .setStyle(ButtonStyle.Primary);
              drawRow.addComponents(bloodDeckDraw);
            } else {
              drawMessageLines.push("-# There is currently no blood deck to draw.");
            }
            await actionInteraction.update({
              "components": [
                drawRow,
              ],
              "content": MessageController.linesToString(drawMessageLines),
            });
            try {
              // Await the second button interaction
              const drawInteraction: ButtonInteraction = await message.awaitMessageComponent<ComponentType.Button>({
                "componentType": ComponentType.Button,
                "filter": collectorFilter,
                "time": 60000,
              });
              await drawInteraction.update({
                "components": [
                ],
                "content": `You selected ${drawInteraction.customId}. Thanks for playing!`,
              });
            } catch {
              await actionInteraction.editReply({
                "components": [
                ],
                "content": "You did not choose in time for the second step.",
              });
            }
          } else if (actionInteraction.customId === "stand") {
            await actionInteraction.update({
              "components": [
              ],
              "content": "STAND",
            });
          } else {
            await interaction.deleteReply();
          }
        } catch {
          await interaction.editReply({
            "components": [
            ],
            "content": "You did not choose in time for the first step.",
          });
        }
      }
    }
  },
};
