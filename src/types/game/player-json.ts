import { HandResult, PlayerCardJson, TurnJson } from "..";
import { PlayerStatus } from "../../enums";

export type PlayerJson = {
  avatarId: string | null;
  cards: PlayerCardJson[];
  id: string;
  globalName: string | null;
  handResults: HandResult[];
  roundTurn: TurnJson | null;
  spentTokenTotal: number;
  status: PlayerStatus;
  tokenTotal: number;
  username: string;
};
