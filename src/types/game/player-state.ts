import {
  HandResult,
  PlayerCard,
  TurnRecord,
} from ".";

export type PlayerState = {
  "currentBloodCards": PlayerCard[];
  "currentSandCards": PlayerCard[];
  "currentSpentTokenTotal": number;
  "currentTokenTotal": number;
  "currentTurnRecord": TurnRecord | null;
  "id": string;
  "isEliminated": boolean;
  "globalName": string | null;
  "handResults": HandResult[];
  "username": string;
};
