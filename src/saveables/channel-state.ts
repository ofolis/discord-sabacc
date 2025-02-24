import * as discordJs from "discord.js";
import { HandResult, Player, Session, UserState } from ".";
import { TOKEN_DEFAULT } from "../constants";
import {
  ChannelCommandMessage,
  CommandOptionType,
  Json,
  Log,
  Saveable,
  Utils,
} from "../core";
import { GameStatus } from "../enums";
import {
  ChannelStateJson,
  RankedPlayerScorable,
  SessionJson,
  UserStateJson,
} from "../types";

export class ChannelState implements Saveable {
  public readonly channelId: string;

  private __lastSessionGameStatus: GameStatus;

  private __latestGameCompletedAt: number | null = null;

  private __latestGameStartedAt: number | null = null;

  private __session: Session;

  private __totalGamesCompleted: number = 0;

  private __totalGamesStarted: number = 0;

  private __userStates: Record<string, UserState> = {};

  public constructor(
    privateChannelMessageOrJson: ChannelCommandMessage | Json,
  ) {
    if (privateChannelMessageOrJson instanceof ChannelCommandMessage) {
      const privateChannelMessage: ChannelCommandMessage =
        privateChannelMessageOrJson;
      const startingTokenTotal: number | undefined =
        privateChannelMessage.getCommandOption<CommandOptionType.INTEGER>(
          "tokens",
          CommandOptionType.INTEGER,
        ) ?? TOKEN_DEFAULT;
      this.__session = new Session(
        privateChannelMessage.user,
        startingTokenTotal,
      );
      this.channelId = privateChannelMessage.channelId;
      // Create initial user state
      this.__createUserState(privateChannelMessage.user);
    } else {
      const json: Json = privateChannelMessageOrJson;
      this.__latestGameCompletedAt = Utils.getJsonEntry(
        json,
        "latestGameCompletedAt",
      ) as number | null;
      this.__latestGameStartedAt = Utils.getJsonEntry(
        json,
        "latestGameStartedAt",
      ) as number | null;
      this.__session = new Session(
        Utils.getJsonEntry(json, "session") as SessionJson,
      );
      this.__totalGamesCompleted = Utils.getJsonEntry(
        json,
        "totalGamesCompleted",
      ) as number;
      this.__totalGamesStarted = Utils.getJsonEntry(
        json,
        "totalGamesStarted",
      ) as number;
      this.__userStates = Object.fromEntries(
        Object.entries(
          Utils.getJsonEntry(json, "userStates") as Record<
            string,
            UserStateJson
          >,
        ).map(([userStateId, userStateJson]) => [
          userStateId,
          new UserState(userStateJson),
        ]),
      );
      this.channelId = Utils.getJsonEntry(json, "channelId") as string;
    }
    // Store the current session game status for future comparison
    this.__lastSessionGameStatus = this.__session.gameStatus;
  }

  public get session(): Session {
    return this.__session;
  }

  public createSession(privateChannelMessage: ChannelCommandMessage): void {
    const startingTokenTotal: number =
      privateChannelMessage.getCommandOption<CommandOptionType.INTEGER>(
        "tokens",
        CommandOptionType.INTEGER,
      ) ?? TOKEN_DEFAULT;
    this.__session = new Session(
      privateChannelMessage.user,
      startingTokenTotal,
    );
  }

  public getUserNickname(userId: string): string | null {
    Log.debug("Getting user nickname.", { userId });
    if (!(userId in this.__userStates)) {
      return null;
    }
    return this.__userStates[userId].nickname;
  }

  public setUserNickname(userId: string, nickname: string | null): void {
    Log.debug("Setting user nickname.", { userId, nickname });
    if (userId in this.__userStates) {
      this.__userStates[userId].nickname = nickname;
    }
  }

  public toJson(): ChannelStateJson {
    this.__updateUserStates();
    return {
      channelId: this.channelId,
      latestGameCompletedAt: this.__latestGameCompletedAt,
      latestGameStartedAt: this.__latestGameStartedAt,
      session: this.__session.toJson(),
      totalGamesCompleted: this.__totalGamesCompleted,
      totalGamesStarted: this.__totalGamesStarted,
      userStates: Object.fromEntries(
        Object.entries(this.__userStates).map(([userStateId, userState]) => [
          userStateId,
          userState.toJson(),
        ]),
      ),
    };
  }

  private __createUserState(userOrPlayer: discordJs.User | Player): void {
    this.__userStates[userOrPlayer.id] = new UserState(userOrPlayer);
  }

  private __logGameCompleted(): void {
    this.__latestGameCompletedAt = Date.now();
    this.__totalGamesCompleted++;
  }

  private __logGameStarted(): void {
    this.__latestGameStartedAt = Date.now();
    this.__totalGamesStarted++;
  }

  private __updateUserStates(): void {
    const previousStatus: GameStatus = this.__lastSessionGameStatus;
    const currentStatus: GameStatus = this.__session.gameStatus;
    this.__lastSessionGameStatus = currentStatus; // Update last known status

    const gameStarted: boolean =
      previousStatus !== GameStatus.ACTIVE &&
      currentStatus === GameStatus.ACTIVE;
    const gameCompleted: boolean =
      previousStatus !== GameStatus.COMPLETED &&
      currentStatus === GameStatus.COMPLETED;

    if (gameStarted) {
      this.__logGameStarted();
      this.__session.allPlayers.forEach(player => {
        if (!(player.id in this.__userStates)) {
          this.__createUserState(player);
        }
        this.__userStates[player.id].logGameStarted();
      });
    }

    if (gameCompleted) {
      this.__logGameCompleted();
      const currentHandResult: HandResult =
        this.__session.getCurrentHandResult();
      const playerRankMap: Record<string, number> =
        currentHandResult.rankings.reduce(
          (acc: Record<string, number>, ranking: RankedPlayerScorable) => {
            acc[ranking.playerId] = ranking.rankIndex;
            return acc;
          },
          {},
        );
      this.__session.allPlayers.forEach(player => {
        if (!(player.id in this.__userStates)) {
          this.__createUserState(player);
        }
        if (player.id in playerRankMap && playerRankMap[player.id] === 0) {
          this.__userStates[player.id].logGameWon();
        } else {
          this.__userStates[player.id].logGameLost();
        }
      });
    }
  }
}
