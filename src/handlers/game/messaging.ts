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
} from "../../discord";
import {
  GameSession,
  GameSessionPlayer,
} from "../../types";

export class Messaging {
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

  public static getNewGameMessageContent(session: GameSession, additionalLines?: string[]): string {
    let messageContentLines: string[] = [
      "# New Game",
      `A new game was started by <@${session.startingPlayer.id}> (${session.startingPlayer.username}).`,
      "## Players",
      `${session.players.map(p => `- <@${p.id}> (${p.username})`).join("\n")}`,
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

  public static getPlayerDetailMessageContent(players: GameSessionPlayer[], currentPlayerIndex?: number): string {
    const messageLineGroups: string[][] = [
    ];
    for (const [
      playerIndex,
      player,
    ] of players.entries()) {
      const messageLines: string[] = [
        `- **${player.username}**${playerIndex === currentPlayerIndex ? " 👤" : ""}`,
        `  - Played Tokens: \`${player.currentPlayedTokenTotal}\``,
        `  - Unplayed Tokens: \`${player.currentUnplayedTokenTotal}\``,
      ];
      messageLineGroups.push(messageLines);
    }
    return messageLineGroups.flat(1).join("\n");
  }

  public static getTurnMessageContent(session: GameSession): string {
    const messageContentLines: string[] = [
      `# <@${session.players[session.currentPlayerIndex].id}>'s Turn`,
      `**Round:** \`${session.currentRoundIndex + 1}\`  |  **Turn:** \`${session.currentTurnIndex + 1}\``,
      "## Table",
      this.getPlayerDetailMessageContent(
        session.players,
        session.currentPlayerIndex,
      ),
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
        messageCreateOptions["components"] = [
        ];
      } else {
        const row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>().addComponents(messageButtons);
        messageCreateOptions["components"] = [
          row,
        ];
      }
    }
    const message: Message = await channel.send(messageCreateOptions);
    return message;
  }
}
