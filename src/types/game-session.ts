import {
  GameSessionPlayer,
} from ".";
import {
  GameSessionStatus,
} from "../enums";

export type GameSession = {
  "channelId": string;
  "currentPlayerIndex": number;
  "currentRoundIndex": number;
  "currentTurnIndex": number;
  "guildId": string;
  "players": GameSessionPlayer[];
  "startedAt"?: number;
  "startingPlayer": GameSessionPlayer;
  "startingTokenTotal": number;
  "status": GameSessionStatus;
};
