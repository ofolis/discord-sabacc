import { HandResult, PlayerCardJson, TurnJson } from "..";
import { PlayerStatus } from "../../enums";

export type PlayerJson = {
  avatarId: string | null;
  currentPlayerCards: PlayerCardJson[];
  currentSpentTokenTotal: number;
  currentTokenTotal: number;
  currentTurn: TurnJson | null;
  id: string;
  globalName: string | null;
  handResults: HandResult[];
  status: PlayerStatus;
  username: string;
};
