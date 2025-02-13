import { PlayerCardJson, TurnJson } from "..";
import { PlayerStatus } from "../../enums";

export type PlayerJson = {
  readonly avatarId: string | null;
  readonly cards: PlayerCardJson[];
  readonly id: string;
  readonly globalName: string | null;
  readonly roundTurn: TurnJson | null;
  readonly spentTokenTotal: number;
  readonly status: PlayerStatus;
  readonly tokenTotal: number;
  readonly username: string;
};
