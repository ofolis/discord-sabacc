import * as discordJs from "discord.js";
import { Player } from ".";
import { Json, Saveable, Utils } from "../core";
import { UserStateJson } from "../types";

export class UserState implements Saveable {
  private __latestGameCompletedAt: number | null = null;

  private __latestGameStartedAt: number | null = null;

  private __totalGamesCompleted: number = 0;

  private __totalGamesLost: number = 0;

  private __totalGamesStarted: number = 0;

  private __totalGamesWon: number = 0;

  public readonly id: string;

  public constructor(userOrPlayerOrJson: discordJs.User | Player | Json) {
    if (
      userOrPlayerOrJson instanceof discordJs.User ||
      userOrPlayerOrJson instanceof Player
    ) {
      const userOrPlayer: discordJs.User | Player = userOrPlayerOrJson;
      this.id = userOrPlayer.id;
    } else {
      const json: Json = userOrPlayerOrJson;
      this.__latestGameCompletedAt = Utils.getJsonEntry(
        json,
        "latestGameCompletedAt",
      ) as number | null;
      this.__latestGameStartedAt = Utils.getJsonEntry(
        json,
        "latestGameStartedAt",
      ) as number | null;
      this.__totalGamesCompleted = Utils.getJsonEntry(
        json,
        "totalGamesCompleted",
      ) as number;
      this.__totalGamesLost = Utils.getJsonEntry(
        json,
        "totalGamesLost",
      ) as number;
      this.__totalGamesStarted = Utils.getJsonEntry(
        json,
        "totalGamesStarted",
      ) as number;
      this.__totalGamesWon = Utils.getJsonEntry(
        json,
        "totalGamesWon",
      ) as number;
      this.id = Utils.getJsonEntry(json, "id") as string;
    }
  }

  private __logGameCompleted(): void {
    this.__latestGameCompletedAt = Date.now();
    this.__totalGamesCompleted++;
  }

  public logGameLost(): void {
    this.__totalGamesLost++;
    this.__logGameCompleted();
  }

  public logGameStarted(): void {
    this.__latestGameStartedAt = Date.now();
    this.__totalGamesStarted++;
  }

  public logGameWon(): void {
    this.__totalGamesWon++;
    this.__logGameCompleted();
  }

  public toJson(): UserStateJson {
    return {
      id: this.id,
      latestGameCompletedAt: this.__latestGameCompletedAt,
      latestGameStartedAt: this.__latestGameStartedAt,
      totalGamesCompleted: this.__totalGamesCompleted,
      totalGamesLost: this.__totalGamesLost,
      totalGamesStarted: this.__totalGamesStarted,
      totalGamesWon: this.__totalGamesWon,
    };
  }
}
