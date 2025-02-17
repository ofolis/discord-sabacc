import { PlayerCardJson, TurnJson } from "..";
import { PlayerStatus } from "../../enums";

export type PlayerJson = {
  readonly avatarId: string | null;
  readonly cards: PlayerCardJson[];
  readonly globalName: string | null;
  readonly id: string;
  readonly previousRoundTurns: TurnJson[];
  readonly roundTurn: TurnJson | null;
  readonly spentTokenTotal: number;
  readonly status: PlayerStatus;
  readonly tokenTotal: number;
  readonly username: string;
};
