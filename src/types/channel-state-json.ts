import { SessionJson, UserStateJson } from ".";

export type ChannelStateJson = {
  channelId: string;
  latestGameCompletedAt: number | null;
  latestGameStartedAt: number | null;
  session: SessionJson | null;
  totalGamesCompleted: number;
  totalGamesStarted: number;
  userStates: Record<string, UserStateJson>;
};
