import {
  Card,
} from ".";

export type PlayerState = {
  "currentBloodCards": Card[];
  "currentSandCards": Card[];
  "currentSpentTokenTotal": number;
  "currentUnspentTokenTotal": number;
  "id": string;
  "globalName": string | null;
  "username": string;
};
