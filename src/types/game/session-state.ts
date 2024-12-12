import {
  PlayerState,
} from "..";
import {
  SessionStatus,
} from "../../enums";

export type SessionState = {
  "channelId": string;
  "currentPlayerIndex": number;
  "currentRoundIndex": number;
  "currentTurnIndex": number;
  "guildId": string;
  "players": PlayerState[];
  "startedAt"?: number;
  "startingPlayer": PlayerState;
  "startingTokenTotal": number;
  "status": SessionStatus;
};
