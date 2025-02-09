import * as discordJs from "discord.js";
import { Player, Session, UserState } from ".";
import { TOKEN_DEFAULT } from "../constants";
import {
  ChannelCommandMessage,
  CommandOptionType,
  Json,
  Log,
  Saveable,
  Utils,
} from "../core";
import { SessionStatus } from "../enums";
import { ChannelStateJson, SessionJson, UserStateJson } from "../types";

export class ChannelState implements Saveable {
  private __lastSessionStatus: SessionStatus;

  private __latestGameCompletedAt: number | null = null;

  private __latestGameStartedAt: number | null = null;

  private __session: Session;

  private __totalGamesCompleted: number = 0;

  private __totalGamesStarted: number = 0;

  private __userStates: Record<string, UserState> = {};

  public readonly channelId: string;

  public get session(): Session {
    return this.__session;
  }

  constructor(privateChannelMessageOrJson: ChannelCommandMessage | Json) {
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
    // Store the current session status for future comparison
    this.__lastSessionStatus = this.__session.status;
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
    const previousStatus: SessionStatus = this.__lastSessionStatus;
    const currentStatus: SessionStatus = this.__session.status;
    this.__lastSessionStatus = currentStatus; // Update last known status

    const gameStarted: boolean =
      previousStatus !== SessionStatus.ACTIVE &&
      currentStatus === SessionStatus.ACTIVE;
    const gameCompleted: boolean =
      previousStatus !== SessionStatus.COMPLETED &&
      currentStatus === SessionStatus.COMPLETED;

    if (gameStarted) {
      this.__logGameStarted();
    }
    if (gameCompleted) {
      this.__logGameCompleted();
    }

    this.__session.allPlayers.forEach(player => {
      if (!(player.id in this.__userStates)) {
        this.__createUserState(player);
      }
      if (gameStarted) {
        this.__userStates[player.id].logGameStarted();
      }
      if (gameCompleted) {
        if (this.__session.activePlayers.length !== 1) {
          Log.throw(
            "Cannot update user states. The game ended with multiple active players.",
            {
              activePlayers: this.__session.activePlayers,
            },
          );
        }
        if (player.id === this.__session.activePlayers[0].id) {
          this.__userStates[player.id].logGameWon();
        } else {
          this.__userStates[player.id].logGameLost();
        }
      }
    });
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
}
