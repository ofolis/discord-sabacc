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

async function sendPlayerPromptResponse(message: string, buttonMap: Record<string, ButtonBuilder>, latestInteraction: CommandInteraction | ButtonInteraction, latestResponse: InteractionResponse | null = null): Promise<InteractionResponse> {
  const buttonRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>();
  for (const customId in buttonMap) {
    const button: ButtonBuilder = buttonMap[customId];
    button.setCustomId(customId);
    buttonRow.addComponents(button);
  }
  if (latestInteraction instanceof CommandInteraction) {
    latestResponse = await latestInteraction.reply({
      "components": [
        buttonRow,
      ],
      "content": message,
      "ephemeral": true,
    });
  } else if (latestInteraction instanceof ButtonInteraction) {
    await latestInteraction.update({
      "components": [
        buttonRow,
      ],
      "content": message,
    });
  } else {
    throw new Error("Interaction type is invalid.");
  }
  if (latestResponse === null) {
    throw new Error("There is no active response.");
  }
  return latestResponse;
}

async function getPlayerButtonInteraction(latestInteraction: CommandInteraction | ButtonInteraction, latestResponse: InteractionResponse): Promise<ButtonInteraction | null> {
  const collectorFilter: CollectorFilter<[MessageComponentInteraction]> = (i) => i.user.id === latestInteraction.user.id;
  try {
    // Await the button interaction
    const buttonInteraction: ButtonInteraction = await latestResponse.awaitMessageComponent<ComponentType.Button>({
      "componentType": ComponentType.Button,
      "filter": collectorFilter,
      "time": 60000,
    });
    return buttonInteraction;
  } catch (result: unknown) {
    // TODO: handle actual errors as well instead of only replying with timeout
    if (result instanceof Error) {
      console.error("OMG");
    } else {
      console.log(result);
    }
    return null;
  }
}

async function promptDraw(session: SessionState, latestInteraction: CommandInteraction | ButtonInteraction, latestResponse: InteractionResponse | null = null): Promise<void> {
  const player: PlayerState = SessionController.getSessionPlayer(
    session,
    latestInteraction.user.id,
  );
  const buttonMap: Record<string, ButtonBuilder> = {};
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
    buttonMap.sandDiscardDraw = new ButtonBuilder()
      .setLabel(MessageController.formatCardString(session.sandDiscard[0]))
      .setStyle(ButtonStyle.Primary);
  } else {
    drawMessageLines.push("-# There is currently no sand discard to draw.");
  }
  if (session.bloodDiscard.length > 0) {
    buttonMap.bloodDiscardDraw = new ButtonBuilder()
      .setLabel(MessageController.formatCardString(session.bloodDiscard[0]))
      .setStyle(ButtonStyle.Primary);
  } else {
    drawMessageLines.push("-# There is currently no blood discard to draw.");
  }
  if (session.sandDeck.length > 0) {
    buttonMap.sandDeckDraw = new ButtonBuilder()
      .setLabel("🟨?")
      .setStyle(ButtonStyle.Primary);
  } else {
    drawMessageLines.push("-# There is currently no sand deck to draw.");
  }
  if (session.bloodDeck.length > 0) {
    buttonMap.bloodDeckDraw = new ButtonBuilder()
      .setLabel("🟥?")
      .setStyle(ButtonStyle.Primary);
  } else {
    drawMessageLines.push("-# There is currently no blood deck to draw.");
  }
  buttonMap.cancel = new ButtonBuilder()
    .setLabel("Cancel")
    .setStyle(ButtonStyle.Secondary);
  latestResponse = await sendPlayerPromptResponse(
    MessageController.linesToString(drawMessageLines),
    buttonMap,
    latestInteraction,
    latestResponse,
  );
  const buttonInteraction: ButtonInteraction | null = await getPlayerButtonInteraction(
    latestInteraction,
    latestResponse,
  );
  if (buttonInteraction === null) {
    // Timeout
  } else {
    switch (buttonInteraction.customId) {
      case "sandDiscardDraw":
        await buttonInteraction.update({
          "components": [
          ],
          "content": `You selected ${buttonInteraction.customId}. Thanks for playing!`,
        });
        break;
      case "bloodDiscardDraw":
        await buttonInteraction.update({
          "components": [
          ],
          "content": `You selected ${buttonInteraction.customId}. Thanks for playing!`,
        });
        break;
      case "sandDeckDraw":
        await buttonInteraction.update({
          "components": [
          ],
          "content": `You selected ${buttonInteraction.customId}. Thanks for playing!`,
        });
        break;
      case "bloodDeckDraw":
        await buttonInteraction.update({
          "components": [
          ],
          "content": `You selected ${buttonInteraction.customId}. Thanks for playing!`,
        });
        break;
      case "cancel":
        await promptTurn(
          session,
          buttonInteraction,
          latestResponse,
        );
        break;
      default:
        throw new Error(`Unknown response ID "${buttonInteraction.customId}".`);
    }
  }
}

async function promptTurn(session: SessionState, latestInteraction: CommandInteraction | ButtonInteraction, latestResponse: InteractionResponse | null = null): Promise<void> {
  const player: PlayerState = SessionController.getSessionPlayer(
    session,
    latestInteraction.user.id,
  );
  const buttonMap: Record<string, ButtonBuilder> = {};
  const drawDisabled: boolean =
    player.currentUnplayedTokenTotal === 0 ||
    (
      session.bloodDeck.length === 0 &&
      session.bloodDiscard.length === 0 &&
      session.sandDeck.length === 0 &&
      session.sandDiscard.length === 0
    ) ? true : false;
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
  buttonMap.draw = new ButtonBuilder()
    .setLabel("Draw")
    .setStyle(ButtonStyle.Success)
    .setDisabled(drawDisabled);
  buttonMap.stand = new ButtonBuilder()
    .setLabel("Stand")
    .setStyle(ButtonStyle.Primary);
  buttonMap.cancel = new ButtonBuilder()
    .setLabel("Cancel")
    .setStyle(ButtonStyle.Secondary);
  latestResponse = await sendPlayerPromptResponse(
    MessageController.linesToString(actionMessageLines),
    buttonMap,
    latestInteraction,
    latestResponse,
  );
  const buttonInteraction: ButtonInteraction | null = await getPlayerButtonInteraction(
    latestInteraction,
    latestResponse,
  );
  if (buttonInteraction === null) {
    // Timeout
  } else {
    switch (buttonInteraction.customId) {
      case "draw":
        await promptDraw(
          session,
          buttonInteraction,
          latestResponse,
        );
        break;
      case "stand":
        await promptStand(buttonInteraction);
        break;
      case "cancel":
        await latestInteraction.deleteReply();
        break;
      default:
        throw new Error(`Unknown response ID "${buttonInteraction.customId}".`);
    }
  }
}

async function promptStand(actionInteraction: ButtonInteraction): Promise<void> {
  await actionInteraction.update({
    "components": [
    ],
    "content": "STAND",
  });
}

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
        const currentPlayer: PlayerState = session.players[session.currentPlayerIndex];
        const messageLines: string[] = [
          `**It is currently ${currentPlayer.globalName ?? currentPlayer.username}'s turn.**`,
          "-# Use the **/info** command to view your hand and see game info.",
        ];
        await interaction.reply({
          "content": MessageController.linesToString(messageLines),
          "ephemeral": true,
        });
      } else {
        await promptTurn(
          session,
          interaction,
        );
      }
    }
  },
};
