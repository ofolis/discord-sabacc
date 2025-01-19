export type UserStateJson = {
  id: string;
  latestGameCompletedAt: number | null;
  latestGameStartedAt: number | null;
  totalGamesCompleted: number;
  totalGamesLost: number;
  totalGamesStarted: number;
  totalGamesWon: number;
};
