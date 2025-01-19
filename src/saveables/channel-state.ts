import { Session, UserState } from ".";
import { Json, Log, Saveable, Utils } from "../core";
import { ChannelStateJson, SessionJson, UserStateJson } from "../types";

export class ChannelState implements Saveable {
  public readonly channelId: string;

  private latestGameCompletedAt: number | null = null;

  private latestGameStartedAt: number | null = null;

  private _session: Session;

  private totalGamesCompleted: number = 0;

  private totalGamesStarted: number = 0;

  private userStates: Record<string, UserState> = {};

  public set session(value: Session) {
    if (value.channelId !== this.channelId) {
      Log.throw(
        "Cannot set session on channel state. Channel IDs do not match.",
        this,
        value,
      );
    }
    this._session = value;
  }

  public get session(): Session {
    return this._session;
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

  constructor(channelId: string, session: Session);

  constructor(json: Json);

  constructor(channelIdOrJson: string | Json, session?: Session) {
    if (typeof channelIdOrJson === "string") {
      if (session === undefined) {
        Log.throw(
          "Cannot construct channel state. Constructor was missing required arguments.",
          { channelId: channelIdOrJson, session },
        );
      }
      this.channelId = channelIdOrJson;
      this._session = session;
    } else {
      this.channelId = Utils.getJsonEntry(
        channelIdOrJson,
        "channelId",
      ) as string;
      this.latestGameCompletedAt = Utils.getJsonEntry(
        channelIdOrJson,
        "latestGameCompletedAt",
      ) as number | null;
      this.latestGameStartedAt = Utils.getJsonEntry(
        channelIdOrJson,
        "latestGameStartedAt",
      ) as number | null;
      this._session = new Session(
        Utils.getJsonEntry(channelIdOrJson, "session") as SessionJson,
      );
      this.totalGamesCompleted = Utils.getJsonEntry(
        channelIdOrJson,
        "totalGamesCompleted",
      ) as number;
      this.totalGamesStarted = Utils.getJsonEntry(
        channelIdOrJson,
        "totalGamesStarted",
      ) as number;
      this.userStates = Object.fromEntries(
        Object.entries(
          Utils.getJsonEntry(channelIdOrJson, "users") as Record<
            string,
            UserStateJson
          >,
        ).map(([userStateId, userStateJson]) => [
          userStateId,
          new UserState(userStateJson),
        ]),
      );
    }
  }
}
