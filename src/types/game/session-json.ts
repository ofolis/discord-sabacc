import { PlayerJson } from ".";
import { Card, HandResult } from "..";
import { SessionStatus } from "../../enums";

export type SessionJson = {
  bloodDeck: Card[];
  bloodDiscard: Card[];
  currentHandIndex: number;
  currentPlayerIndex: number;
  currentRoundIndex: number;
  handResults: HandResult[][];
  playerOrder: string[];
  players: Record<string, PlayerJson>;
  sandDeck: Card[];
  sandDiscard: Card[];
  startedAt: number | null;
  startingPlayerId: string;
  startingTokenTotal: number;
  status: SessionStatus;
};
