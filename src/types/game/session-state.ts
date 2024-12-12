import {
  Card,
  PlayerState,
} from "..";
import {
  SessionStatus,
} from "../../enums";

export type SessionState = {
  "bloodDeck": Card[];
  "bloodDiscard": Card[];
  "channelId": string;
  "currentPlayerIndex": number;
  "currentRoundIndex": number;
  "currentTurnIndex": number;
  "guildId": string;
  "players": PlayerState[];
  "sandDeck": Card[];
  "sandDiscard": Card[];
  "startedAt"?: number;
  "startingPlayer": PlayerState;
  "startingTokenTotal": number;
  "status": SessionStatus;
};
