import { SessionJson, UserStateJson } from ".";

export type ChannelStateJson = {
  readonly channelId: string;
  readonly latestGameCompletedAt: number | null;
  readonly latestGameStartedAt: number | null;
  readonly session: SessionJson;
  readonly totalGamesCompleted: number;
  readonly totalGamesStarted: number;
  readonly userStates: Record<string, UserStateJson>;
};
