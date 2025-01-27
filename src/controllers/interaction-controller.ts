import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  EmbedData,
} from "discord.js";
import { UserInteraction, Utils } from "../core";
import { Player, Session } from "../saveables";

export class InteractionController {
  private static async __setInteractionContent(
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

  public static async informGameCreated(
    userInteraction: UserInteraction,
  ): Promise<void> {
    await this.__setInteractionContent(userInteraction, {
      description: "You started a new game in this channel.",
      title: "New Game Created",
    });
  }

  public static async informGameReplaced(
    userInteraction: UserInteraction,
  ): Promise<void> {
    await this.__setInteractionContent(userInteraction, {
      description: "You chose to end the current game and start a new one.",
      title: "Previous Game Ended",
    });
  }

  public static async informGameNotReplaced(
    userInteraction: UserInteraction,
  ): Promise<void> {
    await this.__setInteractionContent(userInteraction, {
      description: "You chose not to end the current game.",
      title: "New Game Canceled",
    });
  }

  public static async informNoGame(
    userInteraction: UserInteraction,
  ): Promise<void> {
    const contentLines: string[] = [
      "There is no game currently active in this channel.",
      "-# Use the **/new** command to start a new game.",
    ];
    await this.__setInteractionContent(userInteraction, {
      description: Utils.linesToString(contentLines),
      title: "No Game",
    });
  }

  public static async informNotPlaying(
    userInteraction: UserInteraction,
  ): Promise<void> {
    await this.__setInteractionContent(userInteraction, {
      description: "You are not playing in the current game.",
      title: "Not Playing",
    });
  }

  public static async informPlayerInfo(
    userInteraction: UserInteraction,
    session: Session,
    player: Player,
  ): Promise<void> {
    await this.__setInteractionContent(userInteraction, {
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
    await this.__setInteractionContent(
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
    // Remove buttons
    await userInteraction.updateMessage({
      components: [],
    });
    if (
      buttonInteraction !== null &&
      buttonInteraction.customId === "endGame"
    ) {
      return true;
    } else {
      return false;
    }
  }
}
