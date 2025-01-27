import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  EmbedData,
} from "discord.js";
import { Log, UserInteraction, Utils } from "../core";
import { Player, Session } from "../saveables";

export class InteractionController {
  private static async __setInteractionEmbed(
    userInteraction: UserInteraction,
    embedData: EmbedData,
    buttons?: ButtonBuilder[],
  ): Promise<void> {
    await userInteraction.updateMessage({
      embeds: [new EmbedBuilder(embedData)],
      components:
        buttons !== undefined
          ? [
              new ActionRowBuilder<ButtonBuilder>({
                components: buttons,
              }),
            ]
          : undefined,
    });
  }

  private static async __setInteractionFollowup(
    userInteraction: UserInteraction,
    message: string,
  ): Promise<void> {
    await userInteraction.updateMessage({
      embeds: [], // Clear any embed
      components: [], // Clear any buttons
      content: `*${message}*`,
    });
  }

  public static async followupGameCreated(
    userInteraction: UserInteraction,
  ): Promise<void> {
    await this.__setInteractionFollowup(
      userInteraction,
      "You started a new game.",
    );
  }

  public static async informNoGame(
    userInteraction: UserInteraction,
  ): Promise<void> {
    const contentLines: string[] = [
      "There is no game currently active in this channel.",
      "-# Use the **/new** command to start a new game.",
    ];
    await this.__setInteractionEmbed(userInteraction, {
      description: Utils.linesToString(contentLines),
      title: "No Game",
    });
  }

  public static async informNotPlaying(
    userInteraction: UserInteraction,
  ): Promise<void> {
    await this.__setInteractionEmbed(userInteraction, {
      description: "You are not playing in the current game.",
      title: "Not Playing",
    });
  }

  public static async informPlayerInfo(
    userInteraction: UserInteraction,
    session: Session,
    player: Player,
  ): Promise<void> {
    await this.__setInteractionEmbed(userInteraction, {
      fields: [
        {
          inline: true,
          name: "Hand",
          value: (session.currentHandIndex + 1).toString(),
        },
        {
          inline: true,
          name: "Round",
          value: (session.currentRoundIndex + 1).toString(),
        },
        {
          inline: false,
          name: "Player ID",
          value: player.id,
        },
      ],
    });
  }

  public static async promptEndCurrentGame(
    userInteraction: UserInteraction,
  ): Promise<boolean | null> {
    await this.__setInteractionEmbed(
      userInteraction,
      {
        description: "Do you want to end the current game and start a new one?",
        title: "Game In Progress",
      },
      [
        new ButtonBuilder({
          customId: "endGame",
          label: "End Current Game",
          style: ButtonStyle.Danger,
        }),
        new ButtonBuilder({
          customId: "cancel",
          label: "Cancel",
          style: ButtonStyle.Secondary,
        }),
      ],
    );
    const buttonInteraction: ButtonInteraction | null =
      await userInteraction.awaitButtonInteraction();
    if (buttonInteraction === null) {
      await this.__setInteractionFollowup(
        userInteraction,
        "New game creation timed out.",
      );
      return false;
    }
    switch (buttonInteraction.customId) {
      case "endGame":
        await this.__setInteractionFollowup(
          userInteraction,
          "You started a new game. The previous game was ended.",
        );
        return true;
      case "cancel":
        await this.__setInteractionFollowup(
          userInteraction,
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
}
