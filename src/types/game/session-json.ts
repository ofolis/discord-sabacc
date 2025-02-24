import { HandResultJson, PlayerJson } from ".";
import { Card } from "..";
import { CardSuit, DrawSource, GameStatus } from "../../enums";

export type SessionJson = {
  readonly activePlayerIndex: number;
  readonly activePlayerOrder: string[];
  readonly cards: Record<CardSuit, Record<DrawSource, Card[]>>;
  readonly gameStatus: GameStatus;
  readonly handIndex: number;
  readonly handResults: HandResultJson[];
  readonly players: Record<string, PlayerJson>;
  readonly roundIndex: number;
  readonly startedAt: number | null;
  readonly startingPlayerId: string;
  readonly startingTokenTotal: number;
};
