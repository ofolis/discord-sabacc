import {
  CardSuit,
  CardType,
} from "../enums";
import {
  Card,
  PlayerState,
  SessionState,
} from "../types";
import {
  Utils,
} from "../utils";

export class MessageController {
  private static formatTokenString(
    tokenTotal: number,
  ): string {
    return tokenTotal > 0 ? "🪙".repeat(tokenTotal) : "None";
  }

  public static formatCardString(
    card: Card,
  ): string {
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

  public static formatPlayerHandMessage(
    player: PlayerState,
  ): string {
    const bloodCardsString: string = player.currentBloodCards
      .map(card => `\`${this.formatCardString(card)}\``)
      .join(" ") || "`None`";
    const sandCardsString: string = player.currentSandCards
      .map(card => `\`${this.formatCardString(card)}\``)
      .join(" ") || "`None`";
    const contentLines: string[] = [
      `Sand Cards: ${sandCardsString}`,
      `Blood Cards: ${bloodCardsString}`,
      `Played Tokens: \`${this.formatTokenString(player.currentPlayedTokenTotal)}\``,
      `Unplayed Tokens: \`${this.formatTokenString(player.currentUnplayedTokenTotal)}\``,
    ];
    return Utils.linesToString(contentLines);
  }

  public static formatPlayersDetailMessage(
    session: SessionState,
  ): string {
    const messageLineGroups: string[][] = [
    ];
    for (const [
      playerIndex,
      player,
    ] of session.players.entries()) {
      const contentLines: string[] = [
        `- **${player.globalName ?? player.username}**${playerIndex === session.currentPlayerIndex ? " 👤" : ""}`,
        `  - Played Tokens: \`${this.formatTokenString(player.currentPlayedTokenTotal)}\``,
        `  - Unplayed Tokens: \`${this.formatTokenString(player.currentUnplayedTokenTotal)}\``,
      ];
      messageLineGroups.push(contentLines);
    }
    return messageLineGroups.flat(1).join("\n");
  }

  public static formatRoundTurnMessage(
    session: SessionState,
  ): string {
    return `**Round:** \`${(session.currentRoundIndex + 1).toString()}\`  |  **Turn:** \`${(session.currentTurnIndex + 1).toString()}\``;
  }

  public static formatTableDetailMessage(
    session: SessionState,
  ): string {
    const bloodDiscardString: string = session.bloodDiscard.length > 0 ? `\`${this.formatCardString(session.bloodDiscard[0])}\`` : "`None`";
    const sandDiscardString: string = session.sandDiscard.length > 0 ? `\`${this.formatCardString(session.sandDiscard[0])}\`` : "`None`";
    const contentLines: string[] = [
      `Sand Discard: ${sandDiscardString}`,
      `Blood Discard: ${bloodDiscardString}`,
    ];
    return Utils.linesToString(contentLines);
  }
}
