export type UserStateJson = {
  readonly id: string;
  readonly latestGameCompletedAt: number | null;
  readonly latestGameStartedAt: number | null;
  readonly nickname: string | null;
  readonly totalGamesCompleted: number;
  readonly totalGamesLost: number;
  readonly totalGamesStarted: number;
  readonly totalGamesWon: number;
};
