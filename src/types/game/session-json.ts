import { PlayerJson } from ".";
import { Card, HandResult } from "..";
import { CardSuit, DrawSource, GameStatus } from "../../enums";

export type SessionJson = {
  activePlayerIndex: number;
  activePlayerOrder: string[];
  cards: Record<CardSuit, Record<DrawSource, Card[]>>;
  gameStatus: GameStatus;
  handIndex: number;
  handResults: HandResult[][];
  players: Record<string, PlayerJson>;
  roundIndex: number;
  startedAt: number | null;
  startingPlayerId: string;
  startingTokenTotal: number;
};
