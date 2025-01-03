import {
  Card,
  HandResult,
  PendingDiscard,
  TurnHistoryEntry,
} from ".";
import {
  CardSuit,
} from "../../enums";

export type PlayerState = {
  "currentBloodCards": Card[];
  "currentSandCards": Card[];
  "currentSpentTokenTotal": number;
  "currentTokenTotal": number;
  "id": string;
  "isEliminated": boolean;
  "globalName": string | null;
  "handResults": HandResult[];
  "pendingDiscard": PendingDiscard | null;
  "pendingImposterValues": Partial<Record<CardSuit, number>>;
  "turnHistory": TurnHistoryEntry[];
  "username": string;
};
