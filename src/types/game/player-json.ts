import { HandResult, PlayerCard, TurnRecord } from "..";
import { PlayerStatus } from "../../enums";

export type PlayerJson = {
  avatarId: string | null;
  currentBloodCards: PlayerCard[];
  currentSandCards: PlayerCard[];
  currentSpentTokenTotal: number;
  currentTokenTotal: number;
  currentTurnRecord: TurnRecord | null;
  id: string;
  globalName: string | null;
  handResults: HandResult[];
  status: PlayerStatus;
  username: string;
};
