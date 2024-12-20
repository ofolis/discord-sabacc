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
  CardSuit,
  CardType,
} from "../enums";
import {
  SessionController,
} from "./session-controller";
import {
  Card,
  PlayerState,
  SessionState,
} from "../types";

export class InteractionController {
  private static formatCardString(card: Card): string {
    const suitSymbols: Record<CardSuit, string> = {
      [CardSuit.BLOOD]: "🟥",
      [CardSuit.SAND]: "🟨",
    };
    const typeLabels: Record<CardType, string> = {
      [CardType.IMPOSTER]: "Imposter",
      [CardType.NUMBER]: card.value.toString(),
      [CardType.SYLOP]: "Sylop",
    };
    const suitSymbol: string = suitSymbols[card.suit];
    const typeLabel: string = typeLabels[card.type];
    if (!suitSymbol || !typeLabel) {
      throw new Error(`Card had unknown suit (${card.suit.toString()}) or type (${card.type.toString()}).`);
    }
    return `\`${suitSymbol}${typeLabel}\``;
  }

  private static formatPlayerHandMessage(player: PlayerState): string {
    const bloodCardsString: string = player.currentBloodCards
      .map(card => this.formatCardString(card))
      .join(" ") || "`None`";
    const sandCardsString: string = player.currentSandCards
      .map(card => this.formatCardString(card))
      .join(" ") || "`None`";
    const messageLines: string[] = [
      `Sand Cards: ${sandCardsString}`,
      `Blood Cards: ${bloodCardsString}`,
      `Played Tokens: \`${this.formatTokenString(player.currentPlayedTokenTotal)}\``,
      `Unplayed Tokens: \`${this.formatTokenString(player.currentUnplayedTokenTotal)}\``,
    ];
    return this.messageLinesToString(messageLines);
  }

  private static formatPlayersDetailMessage(session: SessionState): string {
    const messageLineGroups: string[][] = [
    ];
    for (const [
      playerIndex,
      player,
    ] of session.players.entries()) {
      const messageLines: string[] = [
        `- **${player.username}**${playerIndex === session.currentPlayerIndex ? " 👤" : ""}`,
        `  - Played Tokens: \`${this.formatTokenString(player.currentPlayedTokenTotal)}\``,
        `  - Unplayed Tokens: \`${this.formatTokenString(player.currentUnplayedTokenTotal)}\``,
      ];
      messageLineGroups.push(messageLines);
    }
    return messageLineGroups.flat(1).join("\n");
  }

  private static formatTableDetailMessage(session: SessionState): string {
    const bloodDiscardString: string = session.bloodDiscard.length > 0 ? this.formatCardString(session.bloodDiscard[0]) : "`None`";
    const sandDiscardString: string = session.sandDiscard.length > 0 ? this.formatCardString(session.sandDiscard[0]) : "`None`";
    const messageLines: string[] = [
      `Sand Discard: ${sandDiscardString}`,
      `Blood Discard: ${bloodDiscardString}`,
    ];
    return this.messageLinesToString(messageLines);
  }

  private static formatTokenString(tokenTotal: number): string {
    return tokenTotal > 0 ? "🪙".repeat(tokenTotal) : "None";
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

  public static getInfoMessage(session: SessionState, playerId: string): string {
    const player: PlayerState = SessionController.getSessionPlayer(
      session,
      playerId,
    );
    const messageLines: string[] = [
      session.players[session.currentPlayerIndex].id === playerId ? "# Your Turn" : `# ${session.players[session.currentPlayerIndex].username}'s Turn`,
      `**Round:** \`${(session.currentRoundIndex + 1).toString()}\`  |  **Turn:** \`${(session.currentTurnIndex + 1).toString()}\``,
      "## Table",
      this.formatTableDetailMessage(session),
      "## Players",
      this.formatPlayersDetailMessage(session),
      "## Your Hand",
      this.formatPlayerHandMessage(player),
    ];
    if (session.players[session.currentPlayerIndex].id === playerId) {
      messageLines.push("");
      messageLines.push("-# Use the **/play** command to take your turn.");
    }
    return this.messageLinesToString(messageLines);
  }

  public static getNewGameMessage(session: SessionState, additionalLines?: string[]): string {
    let messageLines: string[] = [
      "# New Game",
      `A new game was started by <@${session.startingPlayer.id}> (${session.startingPlayer.username}).`,
      "## Players",
      session.players.map(p => `- <@${p.id}> (${p.username})`).join("\n"),
    ];
    if (additionalLines !== undefined) {
      messageLines = [
        ...messageLines,
        "",
        ...additionalLines,
      ];
    }
    return this.messageLinesToString(messageLines);
  }

  public static getTurnMessage(session: SessionState): string {
    const messageLines: string[] = [
      `# <@${session.players[session.currentPlayerIndex].id}>'s Turn`,
      `**Round:** \`${(session.currentRoundIndex + 1).toString()}\`  |  **Turn:** \`${(session.currentTurnIndex + 1).toString()}\``,
      "## Table",
      this.formatTableDetailMessage(session),
      "## Players",
      this.formatPlayersDetailMessage(session),
      "",
      "-# Use the **/play** command to play your turn.",
      "-# Use the **/info** command to view your hand and see game info.",
    ];
    return this.messageLinesToString(messageLines);
  }

  public static messageLinesToString(messageLines: string[]): string {
    return messageLines.join("\n");
  }

  public static async sendPublicMessage(channelId: string, messageContent: string, messageButtons?: ButtonBuilder[]): Promise<Message> {
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
