import { Card, HandResult, PlayerState } from "..";
import { SessionStatus } from "../../enums";

export type SessionState = {
  bloodDeck: Card[];
  bloodDiscard: Card[];
  channelId: string;
  currentHandIndex: number;
  currentPlayerIndex: number;
  currentRoundIndex: number;
  handResults: HandResult[][];
  players: PlayerState[];
  sandDeck: Card[];
  sandDiscard: Card[];
  startedAt?: number;
  startingTokenTotal: number;
  status: SessionStatus;
};
