import { HandResult, PlayerCardJson, TurnJson } from "..";
import { PlayerStatus } from "../../enums";

export type PlayerJson = {
  avatarId: string | null;
  cards: PlayerCardJson[];
  currentTurn: TurnJson | null;
  id: string;
  globalName: string | null;
  handResults: HandResult[];
  spentTokenTotal: number;
  status: PlayerStatus;
  tokenTotal: number;
  username: string;
};
