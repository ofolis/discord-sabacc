import {
  SessionStatus,
} from "../../enums";
import {
  Player,
} from "./player";

export type Session = {
  "channelId": string;
  "currentPlayerIndex": number;
  "currentRoundIndex": number;
  "currentTurnIndex": number;
  "guildId": string;
  "players": Player[];
  "startedAt"?: number;
  "startingPlayer": Player;
  "status": SessionStatus;
  "totalStartingTokens": number;
};
