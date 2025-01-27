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
    await userInteraction.handleSend(
      {
        embeds: [embed],
      },
      true,
      false,
    );
  }

  public static async informNotPlaying(
    userInteraction: UserInteraction,
  ): Promise<void> {
    const embed: EmbedBuilder = new EmbedBuilder({
      description: "You are not playing in the current game.",
      title: "Not Playing",
    });
    await userInteraction.handleSend(
      {
        embeds: [embed],
      },
      true,
      false,
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
    await userInteraction.handleSend(
      {
        embeds: [embed],
      },
      true,
      false,
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
    await userInteraction.handleSend(
      {
        embeds: [
          new EmbedBuilder({
            description:
              "Do you want to end the current game and start a new one?",
            title: "Game In Progress",
          }),
        ],
        components: [buttonRow],
      },
      true,
      false,
    );
    const buttonInteraction: ButtonInteraction | null =
      await userInteraction.awaitButtonInteraction();
    if (
      buttonInteraction !== null &&
      buttonInteraction.customId === "endGame"
    ) {
      await userInteraction.handleSend(
        {
          embeds: [
            new EmbedBuilder({
              description:
                "You chose to end the current game and start a new one.",
              title: "Starting New Game",
            }),
          ],
          components: [],
        },
        true,
        false,
      );
      return true;
    } else {
      await userInteraction.handleSend(
        {
          embeds: [
            new EmbedBuilder({
              description: "You chose not to end the current game.",
              title: "No New Game",
            }),
          ],
          components: [],
        },
        true,
        false,
      );
      return false;
    }
  }
}
