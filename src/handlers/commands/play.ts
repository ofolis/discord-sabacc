import {
  MessageController,
  SessionController,
} from "..";
import {
  Discord,
  DiscordButtonBuilder,
  DiscordButtonInteraction,
  DiscordButtonStyle,
  DiscordCommandInteraction,
  DiscordInteractionResponse,
} from "../../discord";
import {
  SessionStatus,
} from "../../enums";
import type {
  Command,
  PlayerState,
  SessionState,
} from "../../types";
import {
  Utils,
} from "../../utils";

async function handleMessage(
  latestInteraction: DiscordCommandInteraction | DiscordButtonInteraction,
  latestResponse: DiscordInteractionResponse | null = null,
  messageContent: string,
  buttonMap: Record<string, DiscordButtonBuilder>,
): Promise<DiscordInteractionResponse> {
  if (latestResponse === null) {
    if (!(latestInteraction instanceof DiscordCommandInteraction)) {
      throw new Error("Interactions without a response should be a command interaction.");
    }
    latestResponse = await Discord.sendInteractionResponse(
      latestInteraction,
      messageContent,
      true,
      buttonMap,
    );
  } else {
    if (!(latestInteraction instanceof DiscordButtonInteraction)) {
      throw new Error("Interactions with a response should be a button interaction.");
    }
    await Discord.updateInteractionResponse(
      latestInteraction,
      messageContent,
      buttonMap,
    );
  }
  return latestResponse;
}

async function promptDraw(
  session: SessionState,
  latestInteraction: DiscordCommandInteraction | DiscordButtonInteraction,
  latestResponse: DiscordInteractionResponse | null = null,
): Promise<void> {
  const player: PlayerState | null = SessionController.getSessionPlayerFromDiscordUserId(
    session,
    latestInteraction.user.id,
  );
  if (player === null) {
    throw new Error("Player does not exist in session.");
  }
  const buttonMap: Record<string, DiscordButtonBuilder> = {};
  const contentLines: string[] = [
    MessageController.formatRoundTurnMessage(session),
    "## Table",
    MessageController.formatTableDetailMessage(session),
    "## Your Hand",
    MessageController.formatPlayerHandMessage(player),
    "",
    "**Choose a draw option.**",
  ];
  if (session.sandDiscard.length > 0) {
    buttonMap.sandDiscardDraw = new DiscordButtonBuilder()
      .setLabel(MessageController.formatCardString(session.sandDiscard[0]))
      .setStyle(DiscordButtonStyle.Primary);
  } else {
    contentLines.push("-# There is currently no sand discard to draw.");
  }
  if (session.bloodDiscard.length > 0) {
    buttonMap.bloodDiscardDraw = new DiscordButtonBuilder()
      .setLabel(MessageController.formatCardString(session.bloodDiscard[0]))
      .setStyle(DiscordButtonStyle.Primary);
  } else {
    contentLines.push("-# There is currently no blood discard to draw.");
  }
  if (session.sandDeck.length > 0) {
    buttonMap.sandDeckDraw = new DiscordButtonBuilder()
      .setLabel("🟨?")
      .setStyle(DiscordButtonStyle.Primary);
  } else {
    contentLines.push("-# There is currently no sand deck to draw.");
  }
  if (session.bloodDeck.length > 0) {
    buttonMap.bloodDeckDraw = new DiscordButtonBuilder()
      .setLabel("🟥?")
      .setStyle(DiscordButtonStyle.Primary);
  } else {
    contentLines.push("-# There is currently no blood deck to draw.");
  }
  buttonMap.cancel = new DiscordButtonBuilder()
    .setLabel("Cancel")
    .setStyle(DiscordButtonStyle.Secondary);
  latestResponse = await handleMessage(
    latestInteraction,
    latestResponse,
    Utils.linesToString(contentLines),
    buttonMap,
  );
  const buttonInteraction: DiscordButtonInteraction | null = await Discord.getButtonInteraction(
    latestResponse,
    (i) => i.user.id === latestInteraction.user.id,
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

async function promptTurn(
  session: SessionState,
  latestInteraction: DiscordCommandInteraction | DiscordButtonInteraction,
  latestResponse: DiscordInteractionResponse | null = null,
): Promise<void> {
  const player: PlayerState | null = SessionController.getSessionPlayerFromDiscordUserId(
    session,
    latestInteraction.user.id,
  );
  if (player === null) {
    throw new Error("Player does not exist in session.");
  }
  const buttonMap: Record<string, DiscordButtonBuilder> = {};
  const drawDisabled: boolean =
    player.currentUnplayedTokenTotal === 0 ||
    (
      session.bloodDeck.length === 0 &&
      session.bloodDiscard.length === 0 &&
      session.sandDeck.length === 0 &&
      session.sandDiscard.length === 0
    ) ? true : false;
  const contentLines: string[] = [
    MessageController.formatRoundTurnMessage(session),
    "## Table",
    MessageController.formatTableDetailMessage(session),
    "## Your Hand",
    MessageController.formatPlayerHandMessage(player),
    "",
    "**Choose your turn action.**",
  ];
  if (drawDisabled) {
    contentLines.push("-# **Draw** is disabled because you have no remaining tokens.");
  }
  buttonMap.draw = new DiscordButtonBuilder()
    .setLabel("Draw")
    .setStyle(DiscordButtonStyle.Success)
    .setDisabled(drawDisabled);
  buttonMap.stand = new DiscordButtonBuilder()
    .setLabel("Stand")
    .setStyle(DiscordButtonStyle.Primary);
  buttonMap.cancel = new DiscordButtonBuilder()
    .setLabel("Cancel")
    .setStyle(DiscordButtonStyle.Secondary);
  latestResponse = await handleMessage(
    latestInteraction,
    latestResponse,
    Utils.linesToString(contentLines),
    buttonMap,
  );
  const buttonInteraction: DiscordButtonInteraction | null = await Discord.getButtonInteraction(
    latestResponse,
    (i) => i.user.id === latestInteraction.user.id,
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

async function promptStand(
  actionInteraction: DiscordButtonInteraction,
): Promise<void> {
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
      const contentLines: string[] = [
        "**There is no game currently active in this channel.**",
        "-# Use the **/new** command to start a new game.",
      ];
      await interaction.reply({
        "content": Utils.linesToString(contentLines),
        "ephemeral": true,
      });
    } else {
      if (session.players[session.currentPlayerIndex].id !== interaction.user.id) {
        const currentPlayer: PlayerState = session.players[session.currentPlayerIndex];
        const contentLines: string[] = [
          `**It is currently ${currentPlayer.globalName ?? currentPlayer.username}'s turn.**`,
          "-# Use the **/info** command to view your hand and see game info.",
        ];
        await interaction.reply({
          "content": Utils.linesToString(contentLines),
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
