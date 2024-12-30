import {
  Card,
  PendingDiscard,
} from ".";
import {
  TurnHistoryEntry,
} from "./turn-history-entry";

export type PlayerState = {
  "currentBloodCards": Card[];
  "currentSandCards": Card[];
  "currentSpentTokenTotal": number;
  "currentUnspentTokenTotal": number;
  "id": string;
  "globalName": string | null;
  "pendingDiscard": PendingDiscard | null;
  "turnHistory": TurnHistoryEntry[];
  "username": string;
};
