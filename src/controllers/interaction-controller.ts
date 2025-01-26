import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { UserInteraction, Utils } from "../core";
import { Player, Session } from "../saveables";

export class InteractionController {
  public static async informNoGame(
    userInteraction: UserInteraction,
  ): Promise<void> {
    const contentLines: string[] = [
      "There is no game currently active in this channel.",
      "-# Use the **/new** command to start a new game.",
    ];
    const embed: EmbedBuilder = new EmbedBuilder({
      description: Utils.linesToString(contentLines),
      title: "No Game",
    });
    await userInteraction.handleReply(
      {
        embeds: [embed],
      },
      true,
    );
  }

  public static async informNotPlaying(
    userInteraction: UserInteraction,
  ): Promise<void> {
    const embed: EmbedBuilder = new EmbedBuilder({
      description: "You are not playing in the current game.",
      title: "Not Playing",
    });
    await userInteraction.handleReply(
      {
        embeds: [embed],
      },
      true,
    );
  }

  public static async informNotStartedGame(
    userInteraction: UserInteraction,
  ): Promise<void> {
    const embed: EmbedBuilder = new EmbedBuilder({
      description: "The current game is still in progress.",
      title: "New Game Canceled",
    });
    await userInteraction.handleReply(
      {
        embeds: [embed],
      },
      true,
    );
  }

  public static async informPlayerInfo(
    userInteraction: UserInteraction,
    session: Session,
    player: Player,
  ): Promise<void> {
    const embed: EmbedBuilder = new EmbedBuilder({
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
    await userInteraction.handleReply(
      {
        embeds: [embed],
      },
      true,
    );
  }

  public static async informStartedGame(
    userInteraction: UserInteraction,
  ): Promise<void> {
    const embed: EmbedBuilder = new EmbedBuilder({
      description: "You started a new game.",
      title: "Game Started",
    });
    await userInteraction.handleReply(
      {
        embeds: [embed],
      },
      true,
    );
  }

  public static async promptEndCurrentGame(
    userInteraction: UserInteraction,
  ): Promise<boolean | null> {
    const buttonRow: ActionRowBuilder<ButtonBuilder> =
      new ActionRowBuilder<ButtonBuilder>({
        components: [
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
      });
    const embed: EmbedBuilder = new EmbedBuilder({
      description: "Do you want to end the current game and start a new one?",
      title: "Game In Progress",
    });
    await userInteraction.handleReply(
      {
        embeds: [embed],
        components: [buttonRow],
      },
      true,
    );
    const buttonInteraction: ButtonInteraction | null =
      await userInteraction.awaitButtonInteraction();
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
