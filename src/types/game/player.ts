import { HandResult, PlayerCard, TurnRecord } from ".";

export type Player = {
  avatarId: string | null;
  currentBloodCards: PlayerCard[];
  currentSandCards: PlayerCard[];
  currentSpentTokenTotal: number;
  currentTokenTotal: number;
  currentTurnRecord: TurnRecord | null;
  id: string;
  isEliminated: boolean;
  globalName: string | null;
  handResults: HandResult[];
  username: string;
};
