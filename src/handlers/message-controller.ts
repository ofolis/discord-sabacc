import {
  CardSuit,
  CardType,
} from "../enums";
import {
  Card,
  PlayerState,
  SessionState,
} from "../types";

export class MessageController {
  private static formatTokenString(tokenTotal: number): string {
    return tokenTotal > 0 ? "🪙".repeat(tokenTotal) : "None";
  }

  public static formatCardString(card: Card): string {
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
    return `${suitSymbol}${typeLabel}`;
  }

  public static formatPlayerHandMessage(player: PlayerState): string {
    const bloodCardsString: string = player.currentBloodCards
      .map(card => `\`${this.formatCardString(card)}\``)
      .join(" ") || "`None`";
    const sandCardsString: string = player.currentSandCards
      .map(card => `\`${this.formatCardString(card)}\``)
      .join(" ") || "`None`";
    const messageLines: string[] = [
      `Sand Cards: ${sandCardsString}`,
      `Blood Cards: ${bloodCardsString}`,
      `Played Tokens: \`${this.formatTokenString(player.currentPlayedTokenTotal)}\``,
      `Unplayed Tokens: \`${this.formatTokenString(player.currentUnplayedTokenTotal)}\``,
    ];
    return this.linesToString(messageLines);
  }

  public static formatPlayersDetailMessage(session: SessionState): string {
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

  public static formatTableDetailMessage(session: SessionState): string {
    const bloodDiscardString: string = session.bloodDiscard.length > 0 ? `\`${this.formatCardString(session.bloodDiscard[0])}\`` : "`None`";
    const sandDiscardString: string = session.sandDiscard.length > 0 ? `\`${this.formatCardString(session.sandDiscard[0])}\`` : "`None`";
    const messageLines: string[] = [
      `Sand Discard: ${sandDiscardString}`,
      `Blood Discard: ${bloodDiscardString}`,
    ];
    return this.linesToString(messageLines);
  }

  public static linesToString(messageLines: string[]): string {
    return messageLines.join("\n");
  }
}
