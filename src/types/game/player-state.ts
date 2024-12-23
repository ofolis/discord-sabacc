import {
  Card,
} from ".";

export type PlayerState = {
  "currentBloodCards": Card[];
  "currentPlayedTokenTotal": number;
  "currentSandCards": Card[];
  "currentUnplayedTokenTotal": number;
  "id": string;
  "globalName": string | null;
  "username": string;
};
