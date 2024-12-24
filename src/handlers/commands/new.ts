import {
  GameController,
  SessionController,
} from "..";
import {
  Discord,
  DiscordButtonBuilder,
  DiscordButtonInteraction,
  DiscordButtonStyle,
  DiscordCommandInteraction,
  DiscordInteractionResponse,
  DiscordMessage,
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

async function promptJoin(
  session: SessionState,
  interaction: DiscordButtonInteraction | null = null,
): Promise<void> {
  const buttonMap: Record<string, DiscordButtonBuilder> = {
    "joinGame": new DiscordButtonBuilder()
      .setLabel("Join Game")
      .setStyle(DiscordButtonStyle.Primary),
    "startGame": new DiscordButtonBuilder()
      .setLabel("Start Game")
      .setStyle(DiscordButtonStyle.Success)
      .setDisabled(session.players.length <= 1),
  };
  const baseContentLines: string[] = [
    "# New Game",
    `A new game was started by <@${session.startingPlayer.id}> (${session.startingPlayer.globalName ?? session.startingPlayer.username}).`,
    "## Players",
    session.players.map(p => `- <@${p.id}> (${p.globalName ?? p.username})`).join("\n"),
  ];
  const outboundContentLines: string[] = [
    ...baseContentLines,
    "",
    "**Click the button below to join!**",
  ];
  let outbound: DiscordMessage | DiscordInteractionResponse;
  if (interaction === null) {
    outbound = await Discord.sendMessage(
      session.channelId,
      Utils.linesToString(outboundContentLines),
      buttonMap,
    );
  } else {
    outbound = await Discord.updateResponse(
      interaction,
      Utils.linesToString(outboundContentLines),
      buttonMap,
    );
  }
  const buttonInteraction: DiscordButtonInteraction | null = await Discord.getButtonInteraction(
    outbound,
    null,
    60000,
  );
  if (buttonInteraction === null) {
    const startedContentLines: string[] = [
      ...baseContentLines,
      "",
      "**Game creation timed out.**",
    ];
    await Discord.updateMessage(
      outbound,
      Utils.linesToString(startedContentLines),
      {},
    );
  } else {
    switch (buttonInteraction.customId) {
      case "joinGame":
      {
        const existingPlayer: PlayerState | null = SessionController.getSessionPlayerFromDiscordUserId(
          session,
          buttonInteraction.user.id,
        );
        if (existingPlayer === null) {
          SessionController.addSessionPlayerFromDiscordUser(
            session,
            buttonInteraction.user,
          );
        }
        await promptJoin(
          session,
          buttonInteraction,
        );
        break;
      }
      case "startGame":
      {
        SessionController.startSession(session);
        const startedContentLines: string[] = [
          ...baseContentLines,
          "",
          "**The game has started!**",
        ];
        await Discord.updateResponse(
          buttonInteraction,
          Utils.linesToString(startedContentLines),
          {},
        );
        await GameController.tableStartTurn(session);
        break;
      }
      default:
        throw new Error("Unknown response.");
    }
  }
}

export const command: Command = {
  "name": "new",
  "description": "Start a new game.",
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
    let createSession: boolean = true;
    if (session !== null && session.status !== SessionStatus.COMPLETED) {
      const buttonMap: Record<string, DiscordButtonBuilder> = {
        "endGame": new DiscordButtonBuilder()
          .setLabel("End Game")
          .setStyle(DiscordButtonStyle.Danger),
        "cancel": new DiscordButtonBuilder()
          .setLabel("Cancel")
          .setStyle(DiscordButtonStyle.Secondary),
      };
      const contentLines: string[] = [
        "**A game is currently active in this channel.**",
        "Do you want to end it and start a new game?",
      ];
      const interactionResponse: DiscordInteractionResponse = await Discord.sendResponse(
        interaction,
        Utils.linesToString(contentLines),
        true,
        buttonMap,
      );
      const buttonInteraction: DiscordButtonInteraction | null = await Discord.getButtonInteraction(
        interactionResponse,
        (i) => i.user.id === interaction.user.id,
        60000,
      );
      if (buttonInteraction === null || buttonInteraction.customId !== "endGame") {
        createSession = false;
      }
      await interactionResponse.delete();
    }
    if (createSession) {
      const session: SessionState = SessionController.createSession(
        interaction.guildId,
        interaction.channelId,
        interaction.user,
        6,
      );
      await promptJoin(session);
    }
  },
};
