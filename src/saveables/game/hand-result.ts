import { Player } from ".";
import { Json, Saveable, Utils } from "../../core";
import {
  HandResultJson,
  PlayerScoreable,
  RankedPlayerScorable,
} from "../../types";
export class HandResult implements Saveable {
  private static __calculateTokenLoss(
    playerScorable: PlayerScoreable,
    rankIndex: number,
  ): {
    tokenLossTotal: number;
    tokenPenaltyTotal: number;
  } {
    if (rankIndex === 0) {
      return { tokenLossTotal: 0, tokenPenaltyTotal: 0 };
    }
    const isSabacc: boolean =
      playerScorable.bloodCardValue === playerScorable.sandCardValue;
    const tokenPenaltyTotal: number = isSabacc
      ? 1
      : playerScorable.cardDifference;
    const tokenLossTotal: number =
      playerScorable.spentTokenTotal + tokenPenaltyTotal;
    return { tokenLossTotal, tokenPenaltyTotal };
  }

  private static __comparePlayerScores(
    a: Pick<PlayerScoreable, "cardDifference" | "lowestCardValue">,
    b: Pick<PlayerScoreable, "cardDifference" | "lowestCardValue">,
  ): number {
    const cardDifference: number = a.cardDifference - b.cardDifference;
    if (cardDifference !== 0) {
      return cardDifference;
    }
    const valueDifference: number = a.lowestCardValue - b.lowestCardValue;
    return valueDifference;
  }

  private static __rankPlayers(
    playerScorables: PlayerScoreable[],
  ): RankedPlayerScorable[] {
    playerScorables.sort((a, b) => this.__comparePlayerScores(a, b));
    let currentRankIndex: number = 0;
    return playerScorables.map((playerScorable, index) => {
      const isTiedWithPrevious: boolean =
        index !== 0 &&
        this.__comparePlayerScores(
          playerScorable,
          playerScorables[index - 1],
        ) === 0;
      if (index !== 0 && !isTiedWithPrevious) {
        currentRankIndex++;
      }
      return {
        ...playerScorable,
        rankIndex: currentRankIndex,
        ...this.__calculateTokenLoss(playerScorable, currentRankIndex),
      };
    });
  }

  public readonly rankings: RankedPlayerScorable[];

  public constructor(playersOrJson: Player[] | Json) {
    if (Array.isArray(playersOrJson)) {
      const players: Player[] = playersOrJson;
      const playerScorables: PlayerScoreable[] = players.map(player =>
        player["_getScorable"](),
      );
      this.rankings = HandResult.__rankPlayers(playerScorables);
    } else {
      const json: Json = playersOrJson;
      this.rankings = Utils.getJsonEntry(
        json,
        "rankings",
      ) as RankedPlayerScorable[];
    }
  }

  public toJson(): HandResultJson {
    return {
      rankings: this.rankings,
    };
  }
}
