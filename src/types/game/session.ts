import { Card, HandResult, Player } from "..";
import { SessionStatus } from "../../enums";

export type Session = {
  bloodDeck: Card[];
  bloodDiscard: Card[];
  channelId: string;
  currentHandIndex: number;
  currentPlayerIndex: number;
  currentRoundIndex: number;
  handResults: HandResult[][];
  players: Player[];
  sandDeck: Card[];
  sandDiscard: Card[];
  startedAt?: number;
  startingPlayer: Player;
  startingTokenTotal: number;
  status: SessionStatus;
};
