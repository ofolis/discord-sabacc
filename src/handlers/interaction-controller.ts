import {
  ActionRowBuilder,
  ButtonBuilder,
  Channel,
  ChannelType,
  Message,
  MessageCreateOptions,
  TextChannel,
} from "discord.js";
import {
  Discord,
} from "../discord";
import {
  Card,
  SessionState,
} from "../types";
import {
  CardSuit,
  CardType,
} from "../enums";

export class InteractionController {
  private static getCardString(card: Card): string {
    switch (card.suit) {
      case CardSuit.BLOOD:
        switch (card.type) {
          case CardType.IMPOSTER:
            return "🟥 `Imposter`";
          case CardType.NUMBER:
            return `🟥 \`${card.value.toString()}\``;
          case CardType.SYLOP:
            return "🟥 `Sylop`";
          default:
            throw new Error("Blood card had unknown type.");
        }
      case CardSuit.SAND:
        switch (card.type) {
          case CardType.IMPOSTER:
            return "🟨 `Imposter`";
          case CardType.NUMBER:
            return `🟨 \`${card.value.toString()}\``;
          case CardType.SYLOP:
            return "🟨 `Sylop`";
          default:
            throw new Error("Sand card had unknown type.");
        }
      default:
        throw new Error("Card had unknown suit.");
    }
  }

  private static getDiscordChannel(channelId: string): TextChannel {
    const channel: Channel | undefined = Discord.client.channels.cache.get(channelId);
    if (channel === undefined) {
      throw new Error(`Channel ${channelId} was not found in the channel cache.`);
    }
    if (channel.type !== ChannelType.GuildText) {
      throw new Error(`Channel ${channelId} was not a guild text channel.`);
    }
    return channel;
  }

  private static messageContentLinesToString(messageContentLines: string[]): string {
    return messageContentLines.join("\n");
  }

  public static getNewGameMessageContent(session: SessionState, additionalLines?: string[]): string {
    let messageContentLines: string[] = [
      "# New Game",
      `A new game was started by <@${session.startingPlayer.id}> (${session.startingPlayer.username}).`,
      "## Players",
      session.players.map(p => `- <@${p.id}> (${p.username})`).join("\n"),
    ];
    if (additionalLines !== undefined) {
      messageContentLines = [
        ...messageContentLines,
        "",
        ...additionalLines,
      ];
    }
    return this.messageContentLinesToString(messageContentLines);
  }

  public static getPlayersDetailMessageContent(session: SessionState): string {
    const messageLineGroups: string[][] = [
    ];
    for (const [
      playerIndex,
      player,
    ] of session.players.entries()) {
      const messageLines: string[] = [
        `- **${player.username}**${playerIndex === session.currentPlayerIndex ? " 👤" : ""}`,
        `  - Played Tokens: \`${player.currentPlayedTokenTotal.toString()}\``,
        `  - Unplayed Tokens: \`${player.currentUnplayedTokenTotal.toString()}\``,
      ];
      messageLineGroups.push(messageLines);
    }
    return messageLineGroups.flat(1).join("\n");
  }

  public static getTableDetailMessageContent(session: SessionState): string {
    const bloodDiscardString: string = session.bloodDiscard.length > 0 ? this.getCardString(session.bloodDiscard[0]) : "_No Cards_";
    const sandDiscardString: string = session.sandDiscard.length > 0 ? this.getCardString(session.sandDiscard[0]) : "_No Cards_";
    const messageContentLines: string[] = [
      `Sand Discard: ${sandDiscardString}`,
      `Blood Discard: ${bloodDiscardString}`,
    ];
    return this.messageContentLinesToString(messageContentLines);
  }

  public static getTurnMessageContent(session: SessionState): string {
    const messageContentLines: string[] = [
      `# <@${session.players[session.currentPlayerIndex].id}>'s Turn`,
      `**Round:** \`${(session.currentRoundIndex + 1).toString()}\`  |  **Turn:** \`${(session.currentTurnIndex + 1).toString()}\``,
      "## Table",
      this.getTableDetailMessageContent(session),
      "## Players",
      this.getPlayersDetailMessageContent(session),
      "",
      "-# Use the **/play** command to play your turn.",
      "-# Use the **/info** command to view your hand and see game info.",
    ];
    return this.messageContentLinesToString(messageContentLines);
  }

  public static async sendMessage(channelId: string, messageContent: string, messageButtons?: ButtonBuilder[]): Promise<Message> {
    const channel: TextChannel = this.getDiscordChannel(channelId);
    const messageCreateOptions: MessageCreateOptions = {
      "content": messageContent,
    };
    if (messageButtons !== undefined) {
      if (messageButtons.length === 0) {
        messageCreateOptions.components = [
        ];
      } else {
        const row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>().addComponents(messageButtons);
        messageCreateOptions.components = [
          row,
        ];
      }
    }
    const message: Message = await channel.send(messageCreateOptions);
    return message;
  }
}
