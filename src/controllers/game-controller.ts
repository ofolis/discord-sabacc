import { PlayerCard } from "../saveables";

export class GameController {
  public static sortPlayerCards(a: PlayerCard, b: PlayerCard): number {
    // Compare suits first
    if (a.suit !== b.suit) {
      return a.suit === CardSuit.SAND ? 1 : -1;
    }

    // Compare types if suits are the same
    if (a.type !== b.type) {
      if (a.type === CardType.SYLOP || b.type === CardType.SYLOP) {
        return a.type === CardType.SYLOP ? 1 : -1;
      }
      return a.type === CardType.IMPOSTER ? 1 : -1;
    }

    // Compare values if both type and suit are the same
    if (a.type === CardType.NUMBER) {
      return a.getValue() - b.getValue();
    }

    return 0; // Default case for non-number types with matching suit and type
  }
}
