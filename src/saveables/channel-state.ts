import { Session, UserState } from ".";
import { Json, Log, Saveable, Utils } from "../core";
import { DiscordUser } from "../core/discord";
import { ChannelStateJson, SessionJson, UserStateJson } from "../types";

export class ChannelState implements Saveable {
  private __latestGameCompletedAt: number | null = null;

  private __latestGameStartedAt: number | null = null;

  private __session: Session;

  private __totalGamesCompleted: number = 0;

  private __totalGamesStarted: number = 0;

  private __userStates: Record<string, UserState> = {};

  public readonly channelId: string;

  constructor(
    channelId: string,
    startingDiscordUser: DiscordUser,
    startingTokenTotal: number,
  );

  constructor(json: Json);

  constructor(
    channelIdOrJson: string | Json,
    startingDiscordUser?: DiscordUser,
    startingTokenTotal?: number,
  ) {
    if (typeof channelIdOrJson === "string") {
      const channelId: string = channelIdOrJson;
      if (
        startingDiscordUser === undefined ||
        startingTokenTotal === undefined
      ) {
        Log.throw(
          "Cannot construct channel state. Constructor was missing required arguments.",
          {
            startingDiscordUser,
            startingTokenTotal,
          },
        );
      }
      this.__session = this.createSession(
        startingDiscordUser,
        startingTokenTotal,
      );
      this.channelId = channelId;
    } else {
      const json: Json = channelIdOrJson;
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
          Utils.getJsonEntry(json, "users") as Record<string, UserStateJson>,
        ).map(([userStateId, userStateJson]) => [
          userStateId,
          new UserState(userStateJson),
        ]),
      );
      this.channelId = Utils.getJsonEntry(json, "channelId") as string;
    }
  }

  public get session(): Session {
    return this.__session;
  }

  public createSession(
    startingDiscordUser: DiscordUser,
    startingTokenTotal: number,
  ): Session {
    this.__session = new Session(startingDiscordUser, startingTokenTotal);
    return this.__session;
  }

  public toJson(): ChannelStateJson {
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
