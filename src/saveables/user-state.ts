import { Json, Saveable, Utils } from "../core";
import { DiscordUser } from "../core/discord";
import { UserStateJson } from "../types";

export class UserState implements Saveable {
  public readonly id: string;

  private latestGameCompletedAt: number | null = null;

  private latestGameStartedAt: number | null = null;

  private totalGamesCompleted: number = 0;

  private totalGamesLost: number = 0;

  private totalGamesStarted: number = 0;

  private totalGamesWon: number = 0;

  public toJson(): UserStateJson {
    return {
      id: this.id,
      latestGameCompletedAt: this.latestGameCompletedAt,
      latestGameStartedAt: this.latestGameStartedAt,
      totalGamesCompleted: this.totalGamesCompleted,
      totalGamesLost: this.totalGamesLost,
      totalGamesStarted: this.totalGamesStarted,
      totalGamesWon: this.totalGamesWon,
    };
  }

  constructor(discordUserOrJson: DiscordUser | Json) {
    if (discordUserOrJson instanceof DiscordUser) {
      this.id = discordUserOrJson.id;
    } else {
      this.id = Utils.getJsonEntry(discordUserOrJson, "id") as string;
      this.latestGameCompletedAt = Utils.getJsonEntry(
        discordUserOrJson,
        "latestGameCompletedAt",
      ) as number | null;
      this.latestGameStartedAt = Utils.getJsonEntry(
        discordUserOrJson,
        "latestGameStartedAt",
      ) as number | null;
      this.totalGamesCompleted = Utils.getJsonEntry(
        discordUserOrJson,
        "totalGamesCompleted",
      ) as number;
      this.totalGamesLost = Utils.getJsonEntry(
        discordUserOrJson,
        "totalGamesLost",
      ) as number;
      this.totalGamesStarted = Utils.getJsonEntry(
        discordUserOrJson,
        "totalGamesStarted",
      ) as number;
      this.totalGamesWon = Utils.getJsonEntry(
        discordUserOrJson,
        "totalGamesWon",
      ) as number;
    }
  }
}
