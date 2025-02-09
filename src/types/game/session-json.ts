import { PlayerJson } from ".";
import { Card, HandResult } from "..";
import { CardSuit, DrawSource, SessionStatus } from "../../enums";

export type SessionJson = {
  activePlayerIndex: number;
  activePlayerOrder: string[];
  cards: Record<CardSuit, Record<DrawSource, Card[]>>;
  handIndex: number;
  handResults: HandResult[][];
  players: Record<string, PlayerJson>;
  roundIndex: number;
  startedAt: number | null;
  startingPlayerId: string;
  startingTokenTotal: number;
  status: SessionStatus;
};
