import { Session, UserState } from ".";
import { Json, Log, Saveable, Utils } from "../core";
import { DiscordUser } from "../core/discord";
import { ChannelStateJson, SessionJson, UserStateJson } from "../types";

export class ChannelState implements Saveable {
  public readonly channelId: string;

  private latestGameCompletedAt: number | null = null;

  private latestGameStartedAt: number | null = null;

  private session: Session;

  private totalGamesCompleted: number = 0;

  private totalGamesStarted: number = 0;

  private userStates: Record<string, UserState> = {};

  public createSession(
    startingDiscordUser: DiscordUser,
    startingTokenTotal: number,
  ): Session {
    this.session = new Session(this, startingDiscordUser, startingTokenTotal);
    return this.session;
  }

  public getSession(): Session {
    return this.session;
  }

  public toJson(): ChannelStateJson {
    return {
      channelId: this.channelId,
      latestGameCompletedAt: this.latestGameCompletedAt,
      latestGameStartedAt: this.latestGameStartedAt,
      session: this.session.toJson(),
      totalGamesCompleted: this.totalGamesCompleted,
      totalGamesStarted: this.totalGamesStarted,
      userStates: Object.fromEntries(
        Object.entries(this.userStates).map(([userStateId, userState]) => [
          userStateId,
          userState.toJson(),
        ]),
      ),
    };
  }

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
      this.channelId = channelId;
      this.session = this.createSession(
        startingDiscordUser,
        startingTokenTotal,
      );
    } else {
      const json: Json = channelIdOrJson;
      this.channelId = Utils.getJsonEntry(json, "channelId") as string;
      this.latestGameCompletedAt = Utils.getJsonEntry(
        json,
        "latestGameCompletedAt",
      ) as number | null;
      this.latestGameStartedAt = Utils.getJsonEntry(
        json,
        "latestGameStartedAt",
      ) as number | null;
      this.session = new Session(
        this,
        Utils.getJsonEntry(json, "session") as SessionJson,
      );
      this.totalGamesCompleted = Utils.getJsonEntry(
        json,
        "totalGamesCompleted",
      ) as number;
      this.totalGamesStarted = Utils.getJsonEntry(
        json,
        "totalGamesStarted",
      ) as number;
      this.userStates = Object.fromEntries(
        Object.entries(
          Utils.getJsonEntry(json, "users") as Record<string, UserStateJson>,
        ).map(([userStateId, userStateJson]) => [
          userStateId,
          new UserState(this, userStateJson),
        ]),
      );
    }
  }
}
