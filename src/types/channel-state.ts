import { Session } from "./game";

export type ChannelState = {
  channelId: string;
  latestGameCompletedAt: number | null;
  latestGameStartedAt: number | null;
  session: Session;
  totalGamesCompleted: number;
  totalGamesStarted: number;
};
