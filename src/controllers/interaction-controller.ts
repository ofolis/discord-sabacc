import * as discordJs from "discord.js";
import { PLAYER_MAXIMUM, PLAYER_MINIMUM } from "../constants";
import {
  ChannelCommandMessage,
  ChannelMessage,
  Discord,
  Log,
  Utils,
} from "../core";
import { ChannelState } from "../saveables";
import { PlayerJson } from "../types";

export class InteractionController {
  private static async __createChannelMessageEmbed(
    channelId: string,
    embedData: discordJs.EmbedData,
    buttons?: discordJs.ButtonBuilder[],
  ): Promise<ChannelMessage> {
    return await Discord.sendChannelMessage(
      channelId,
      this.__createEmbedBaseMessageOptions(embedData, buttons),
    );
  }

  private static __createEmbedBaseMessageOptions(
    embedData: discordJs.EmbedData,
    buttons?: discordJs.ButtonBuilder[],
  ): discordJs.BaseMessageOptions {
    const components: discordJs.ActionRowBuilder<discordJs.ButtonBuilder>[] =
      buttons !== undefined && buttons.length > 0
        ? [
            new discordJs.ActionRowBuilder<discordJs.ButtonBuilder>({
              components: buttons,
            }),
          ]
        : [];
    return {
      embeds: [new discordJs.EmbedBuilder(embedData)],
      components: components.length > 0 ? components : undefined,
    };
  }

  private static __formatNameString(
    playerOrUser: PlayerJson | discordJs.User,
  ): string {
    return (playerOrUser.globalName ?? playerOrUser.username).toUpperCase();
  }

  private static async __setChannelMessageEmbed(
    channelMessage: ChannelMessage,
    embedData: discordJs.EmbedData,
    buttons?: discordJs.ButtonBuilder[],
  ): Promise<void> {
    await channelMessage.update(
      this.__createEmbedBaseMessageOptions(embedData, buttons),
    );
  }

  private static async __setChannelMessageFollowup(
    channelMessage: ChannelMessage,
    message: string,
  ): Promise<void> {
    await channelMessage.update({
      embeds: [], // Clear any embed
      components: [], // Clear any buttons
      content: `*${message}*`,
    });
  }

  public static async followupGameCreated(
    channelMessage: ChannelMessage,
  ): Promise<void> {
    await this.__setChannelMessageFollowup(
      channelMessage,
      "You created a new game.",
    );
  }

  public static async informNoGame(
    channelMessage: ChannelMessage,
  ): Promise<void> {
    const contentLines: string[] = [
      "There is no game currently active in this channel.",
      "-# Use the **/new** command to start a new game.",
    ];
    await this.__setChannelMessageEmbed(channelMessage, {
      description: Utils.linesToString(contentLines),
      title: "No Game",
    });
  }

  public static async informNotPlaying(
    channelMessage: ChannelMessage,
  ): Promise<void> {
    await this.__setChannelMessageEmbed(channelMessage, {
      description: "You are not playing in the current game.",
      title: "Not Playing",
    });
  }

  public static async informPlayerInfo(
    channelMessage: ChannelMessage,
    channelState: ChannelState,
    playerId: string,
  ): Promise<void> {
    const playerState: PlayerJson =
      channelState.session.getPlayerState(playerId);
    await this.__setChannelMessageEmbed(channelMessage, {
      fields: [
        {
          inline: true,
          name: "Hand",
          value: (channelState.session.handIndex + 1).toString(),
        },
        {
          inline: true,
          name: "Round",
          value: (channelState.session.roundIndex + 1).toString(),
        },
        {
          inline: false,
          name: "Player ID",
          value: playerState.id,
        },
      ],
    });
  }

  public static async promptEndCurrentGame(
    channelMessage: ChannelMessage,
  ): Promise<boolean | null> {
    await this.__setChannelMessageEmbed(
      channelMessage,
      {
        description: "Do you want to end the current game and start a new one?",
        title: "Game In Progress",
      },
      [
        new discordJs.ButtonBuilder({
          customId: "endGame",
          label: "End Current Game",
          style: discordJs.ButtonStyle.Danger,
        }),
        new discordJs.ButtonBuilder({
          customId: "cancel",
          label: "Cancel",
          style: discordJs.ButtonStyle.Secondary,
        }),
      ],
    );
    const buttonInteraction: discordJs.ButtonInteraction | null =
      await channelMessage.awaitButtonInteraction();
    if (buttonInteraction === null) {
      await this.__setChannelMessageFollowup(
        channelMessage,
        "New game creation timed out.",
      );
      return false;
    }
    switch (buttonInteraction.customId) {
      case "endGame":
        await this.__setChannelMessageFollowup(
          channelMessage,
          "You created a new game. The previous game was ended.",
        );
        return true;
      case "cancel":
        await this.__setChannelMessageFollowup(
          channelMessage,
          "You canceled new game creation. The current game is still active.",
        );
        return false;
      default:
        Log.throw(
          "Could not resolve end current game prompt. Unknown button ID.",
          buttonInteraction,
        );
    }
  }

  public static async promptJoinGame(
    privateChannelMessage: ChannelCommandMessage,
  ): Promise<discordJs.User[] | null> {
    let channelMessage: ChannelMessage | null = null;
    const userAccumulator: discordJs.User[] = [];
    while (userAccumulator.length + 1 < PLAYER_MAXIMUM) {
      const embedData: discordJs.EmbedData = {
        description: "JOIN!",
        fields: [
          {
            name: "Players",
            value: [privateChannelMessage.user, ...userAccumulator]
              .map(user => this.__formatNameString(user))
              .join(","),
          },
        ],
        title: "JOIN",
      };
      const buttons: discordJs.ButtonBuilder[] = [
        new discordJs.ButtonBuilder({
          customId: "join",
          label: "Join Game",
          style: discordJs.ButtonStyle.Primary,
        }),
        new discordJs.ButtonBuilder({
          customId: "start",
          disabled: userAccumulator.length + 1 < PLAYER_MINIMUM,
          label: "Start Game",
          style: discordJs.ButtonStyle.Success,
        }),
      ];
      if (channelMessage === null) {
        channelMessage = await this.__createChannelMessageEmbed(
          privateChannelMessage.channelId,
          embedData,
          buttons,
        );
      } else {
        await this.__setChannelMessageEmbed(channelMessage, embedData, buttons);
      }
      const buttonInteraction: discordJs.ButtonInteraction | null =
        await channelMessage.awaitButtonInteraction();
      if (buttonInteraction === null) {
        await this.__setChannelMessageFollowup(
          channelMessage,
          "Game setup timed out.",
        );
        return null;
      }
      switch (buttonInteraction.customId) {
        case "join":
          if (
            buttonInteraction.user.id !== privateChannelMessage.user.id &&
            !userAccumulator.some(user => user.id === buttonInteraction.user.id)
          ) {
            userAccumulator.push(buttonInteraction.user);
          }
          continue;
        case "start":
          await this.__setChannelMessageFollowup(
            channelMessage,
            `The game was started by ${this.__formatNameString(buttonInteraction.user)}!`,
          );
          return userAccumulator;
        default:
          Log.throw(
            "Could not resolve game setup prompt. Unknown button ID.",
            buttonInteraction,
          );
      }
    }
    if (channelMessage === null) {
      Log.throw(
        "Cannot conclude game setup prompt. Channel interaction was never set.",
      );
    }
    await this.__setChannelMessageFollowup(
      channelMessage,
      `${PLAYER_MAXIMUM.toString()} players have joined. The game has started!`,
    );
    return userAccumulator;
  }
}
