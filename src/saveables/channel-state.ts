import { User } from "discord.js";
import { Session, UserState } from ".";
import {
  CommandOptionType,
  Json,
  PrivateChannelMessage,
  Saveable,
  Utils,
} from "../core";
import { ChannelStateJson, SessionJson, UserStateJson } from "../types";

export class ChannelState implements Saveable {
  private __latestGameCompletedAt: number | null = null;

  private __latestGameStartedAt: number | null = null;

  private __loadedJson: Json | null = null;

  private __session: Session;

  private __totalGamesCompleted: number = 0;

  private __totalGamesStarted: number = 0;

  private __userStates: Record<string, UserState> = {};

  public readonly channelId: string;

  public get session(): Session {
    return this.__session;
  }

  constructor(privateChannelMessageOrJson: PrivateChannelMessage | Json) {
    if (privateChannelMessageOrJson instanceof PrivateChannelMessage) {
      const privateChannelMessage: PrivateChannelMessage =
        privateChannelMessageOrJson;
      const startingTokenTotal: number =
        privateChannelMessage.getCommandOption<CommandOptionType.INTEGER>(
          "tokens",
          CommandOptionType.INTEGER,
        );
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
      // Store the loaded JSON for future comparison
      this.__loadedJson = json;
    }
  }

  private __createUserState(user: User): void {
    this.__userStates[user.id] = new UserState(user);
  }

  private __updateUserStates(): void {
    // TODO: write logic to compare old/new states and update user states
  }

  public createSession(privateChannelMessage: PrivateChannelMessage): void {
    const startingTokenTotal: number =
      privateChannelMessage.getCommandOption<CommandOptionType.INTEGER>(
        "tokens",
        CommandOptionType.INTEGER,
      );
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
