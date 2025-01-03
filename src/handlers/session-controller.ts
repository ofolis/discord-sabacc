import {
  DiscordUser,
} from "../discord";
import {
  CardSuit,
  SessionStatus,
} from "../enums";
import {
  IO,
} from "../io";
import {
  Card,
  PlayerState,
  SessionState,
} from "../types";
import {
  createBloodDeck,
  createSandDeck,
} from "../constants/game/decks";

export class SessionController {
  public static createSession(
    channelId: string,
    discordUsers: DiscordUser[],
    startingTokenTotal: number,
  ): SessionState {
    const players: PlayerState[] = discordUsers.map(
      discordUser => {
        return {
          "currentBloodCards": [
          ],
          "currentSandCards": [
          ],
          "currentSpentTokenTotal": 0,
          "currentTokenTotal": startingTokenTotal,
          "id": discordUser.id,
          "isEliminated": false,
          "globalName": discordUser.globalName,
          "handResults": [
          ],
          "pendingDiscard": null,
          "pendingImposterValues": {},
          "turnHistory": [
          ],
          "username": discordUser.username,
        };
      },
    );
    const session: SessionState = {
      "bloodDeck": createBloodDeck(),
      "bloodDiscard": [
      ],
      "channelId": channelId,
      "currentHandIndex": 0,
      "currentPlayerIndex": 0,
      "currentRoundIndex": 0,
      "players": players,
      "sandDeck": createSandDeck(),
      "sandDiscard": [
      ],
      "startingTokenTotal": startingTokenTotal,
      "status": SessionStatus.PENDING,
    };
    this.saveSession(session);
    return session;
  }

  public static getPlayerPendingImposterValue(
    player: PlayerState,
    suit: CardSuit,
  ): number {
    if (player.pendingImposterValues[suit] === undefined) {
      throw new Error("Player does not contain required pending imposter value.");
    }
    return player.pendingImposterValues[suit];
  }

  public static getSessionPlayerById(
    session: SessionState,
    playerId: string,
  ): PlayerState | null {
    const player: PlayerState | undefined = session.players.find(player => player.id === playerId);
    return player ?? null;
  }

  public static loadSession(
    channelId: string,
  ): SessionState | null {
    const loadResult: SessionState | null = IO.loadData(channelId) as SessionState | null;
    return loadResult;
  }

  public static saveSession(
    session: SessionState,
  ): void {
    IO.saveData(
      session.channelId,
      session,
    );
  }

  public static validatePlayerCard(
    player: PlayerState,
    card: Card,
  ): void {
    if (!player.currentBloodCards.includes(card) && !player.currentSandCards.includes(card)) {
      throw new Error("Player does not contain card.");
    }
    if (card.suit === CardSuit.BLOOD && player.currentSandCards.includes(card) || card.suit === CardSuit.SAND && player.currentBloodCards.includes(card)) {
      throw new Error("Player card is in the wrong set.");
    }
  }

  public static validatePlayerCardSets(
    player: PlayerState,
  ): void {
    for (const card of player.currentBloodCards) {
      if (card.suit !== CardSuit.BLOOD) {
        throw new Error("Blood card set contained a non-blood card.");
      }
    }
    for (const card of player.currentSandCards) {
      if (card.suit !== CardSuit.SAND) {
        throw new Error("Sand card set contained a non-sand card.");
      }
    }
  }

  public static validateSessionPlayer(
    session: SessionState,
    player: PlayerState,
  ): void {
    if (!session.players.includes(player)) {
      throw new Error("Session does not contain player.");
    }
  }
}
