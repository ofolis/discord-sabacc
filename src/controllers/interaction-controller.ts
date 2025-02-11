import * as discordJs from "discord.js";
import { PLAYER_MAXIMUM, PLAYER_MINIMUM } from "../constants";
import {
  ChannelCommandMessage,
  ChannelMessage,
  Discord,
  Log,
  Utils,
} from "../core";
import { CardSuit, DrawSource, TurnAction } from "../enums";
import { ChannelState, Player, PlayerCard } from "../saveables";

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
    playerOrUser: Player | discordJs.User,
  ): string {
    return (playerOrUser.globalName ?? playerOrUser.username).toUpperCase();
  }

  private static async __setChannelMessageEmbed(
    message: ChannelMessage,
    embedData: discordJs.EmbedData,
    buttons?: discordJs.ButtonBuilder[],
  ): Promise<void> {
    await message.update(
      this.__createEmbedBaseMessageOptions(embedData, buttons),
    );
  }

  private static async __setChannelMessageFollowup(
    message: ChannelMessage,
    content: string,
  ): Promise<void> {
    await message.update({
      embeds: [], // Clear any embed
      components: [], // Clear any buttons
      content: `*${content}*`,
    });
  }

  public static async announceTurnDraw(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    //TODO: Implement
  }

  public static async announceTurnReveal(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    //TODO: Implement
  }

  public static async announceTurnStand(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    //TODO: Implement
  }

  public static async followupGameCreated(
    message: ChannelMessage,
  ): Promise<void> {
    await this.__setChannelMessageFollowup(message, "You created a new game.");
  }

  public static async informNoGame(message: ChannelMessage): Promise<void> {
    const contentLines: string[] = [
      "There is no game currently active in this channel.",
      "-# Use the **/new** command to start a new game.",
    ];
    await this.__setChannelMessageEmbed(message, {
      description: Utils.linesToString(contentLines),
      title: "No Game",
    });
  }

  public static async informNotPlaying(message: ChannelMessage): Promise<void> {
    await this.__setChannelMessageEmbed(message, {
      description: "You are not playing in the current game.",
      title: "Not Playing",
    });
  }

  public static async informNotTurn(
    message: ChannelMessage,
    channelState: ChannelState,
  ): Promise<void> {
    await this.__setChannelMessageEmbed(message, {
      description: `It is currently ${this.__formatNameString(channelState.session.currentPlayer)}'s turn.`,
      title: "Not Your Turn",
    });
  }

  public static async informPlayerInfo(
    message: ChannelMessage,
    channelState: ChannelState,
    playerId: string,
  ): Promise<void> {
    const player: Player = channelState.session.getPlayerById(playerId);
    await this.__setChannelMessageEmbed(message, {
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
          value: player.id,
        },
      ],
    });
  }

  public static async informTurnComplete(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    //TODO: Implement
  }

  public static async informTurnIncomplete(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    //TODO: Implement
  }

  public static async promptChooseDrawDeck(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<[CardSuit, DrawSource] | null> {
    //TODO: Impelment
  }

  public static async promptChooseDiscardedCard(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<PlayerCard | null> {
    //TODO: Implement
  }

  public static async promptChooseTurnAction(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<TurnAction | null> {
    const player: Player = channelState.session.getPlayerById(message.user.id);
    await this.__setChannelMessageEmbed(
      message,
      {
        description: "Choose your turn action.",
        title: "Turn Action",
      },
      [
        new discordJs.ButtonBuilder({
          customId: "draw",
          label: "Draw",
          style: discordJs.ButtonStyle.Primary,
          disabled: player.currentTokenTotal === 0,
        }),
        new discordJs.ButtonBuilder({
          customId: "stand",
          label: "Stand",
          style: discordJs.ButtonStyle.Primary,
        }),
      ],
    );
    const buttonInteraction: discordJs.ButtonInteraction | null =
      await message.awaitButtonInteraction();
    if (buttonInteraction === null) {
      await this.__setChannelMessageFollowup(
        message,
        "Turn action selection timed out.",
      );
      return null;
    }
    switch (buttonInteraction.customId) {
      case "draw":
        return TurnAction.DRAW;
      case "stand":
        return TurnAction.STAND;
      default:
        Log.throw(
          "Could not resolve choose turn action prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  public static async promptEndCurrentGame(
    message: ChannelMessage,
  ): Promise<boolean | null> {
    await this.__setChannelMessageEmbed(
      message,
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
      await message.awaitButtonInteraction();
    if (buttonInteraction === null) {
      await this.__setChannelMessageFollowup(
        message,
        "New game creation timed out.",
      );
      return false;
    }
    switch (buttonInteraction.customId) {
      case "endGame":
        await this.__setChannelMessageFollowup(
          message,
          "You created a new game. The previous game was ended.",
        );
        return true;
      case "cancel":
        await this.__setChannelMessageFollowup(
          message,
          "You canceled new game creation. The current game is still active.",
        );
        return false;
      default:
        Log.throw(
          "Could not resolve end current game prompt. Unknown button interaction custom ID.",
          { buttonInteraction },
        );
    }
  }

  public static async promptJoinGame(
    message: ChannelCommandMessage,
  ): Promise<discordJs.User[] | null> {
    let channelMessage: ChannelMessage | null = null;
    const userAccumulator: discordJs.User[] = [];
    while (userAccumulator.length + 1 < PLAYER_MAXIMUM) {
      const embedData: discordJs.EmbedData = {
        description: "JOIN!",
        fields: [
          {
            name: "Players",
            value: [message.user, ...userAccumulator]
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
          message.channelId,
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
            buttonInteraction.user.id !== message.user.id &&
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
            "Could not resolve game setup prompt. Unknown button interaction custom ID.",
            {
              buttonInteraction,
            },
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

  public static async promptRevealCards(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<boolean | null> {
    //TODO: Implement
  }
}
