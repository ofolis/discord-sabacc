import { Player } from ".";
import { Json, Log, Saveable, Utils } from "../../core";
import {
  HandResultJson,
  PlayerScoreable,
  RankedPlayerScorable,
} from "../../types";
export class HandResult implements Saveable {
  public readonly rankings: RankedPlayerScorable[];

  private __remainingPlayerIds: string[] | null = null;

  public constructor(playersOrJson: Player[] | Json) {
    if (Array.isArray(playersOrJson)) {
      const players: Player[] = playersOrJson;
      const playerScorables: PlayerScoreable[] = players.map(player =>
        player["_getScorable"](),
      );
      this.rankings = HandResult.__rankPlayers(playerScorables);
    } else {
      const json: Json = playersOrJson;
      this.__remainingPlayerIds = Utils.getJsonEntry(
        json,
        "remainingPlayerIds",
      ) as string[] | null;
      this.rankings = Utils.getJsonEntry(
        json,
        "rankings",
      ) as RankedPlayerScorable[];
    }
  }

  public get remainingPlayerIds(): string[] {
    if (this.__remainingPlayerIds === null) {
      Log.throw(
        "Cannot get remaining player IDs. Remaining player IDs has not been set.",
      );
    }
    return this.__remainingPlayerIds;
  }

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
    const tokenLossTotal: number = Math.min(
      playerScorable.spentTokenTotal + tokenPenaltyTotal,
      playerScorable.tokenTotal,
    );
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

  public toJson(): HandResultJson {
    return {
      rankings: this.rankings,
      remainingPlayerIds: this.__remainingPlayerIds,
    };
  }

  protected _setRemainingPlayerIds(remainingPlayerIds: string[]): void {
    if (this.__remainingPlayerIds !== null) {
      Log.throw(
        "Cannot set remaining player IDs. Remaining player IDs have already been set.",
      );
    }
    this.__remainingPlayerIds = remainingPlayerIds;
  }
}
