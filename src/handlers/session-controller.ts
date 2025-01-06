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
  PlayerCard,
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
          "currentTurnRecord": null,
          "id": discordUser.id,
          "isEliminated": false,
          "globalName": discordUser.globalName,
          "handResults": [
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
      "handResults": [
      ],
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
    playerCard: PlayerCard,
  ): void {
    if (!player.currentBloodCards.includes(playerCard) && !player.currentSandCards.includes(playerCard)) {
      throw new Error("Player does not contain card.");
    }
    if (playerCard.card.suit === CardSuit.BLOOD && player.currentSandCards.includes(playerCard) || playerCard.card.suit === CardSuit.SAND && player.currentBloodCards.includes(playerCard)) {
      throw new Error("Player card is in the wrong set.");
    }
  }

  public static validatePlayerCardSets(
    player: PlayerState,
  ): void {
    if (player.currentBloodCards.length === 0) {
      throw new Error("Player did not contain any blood cards.");
    }
    if (player.currentSandCards.length === 0) {
      throw new Error("Player did not contain any sand cards.");
    }
    for (const playerCard of player.currentBloodCards) {
      if (playerCard.card.suit !== CardSuit.BLOOD) {
        throw new Error("Player blood card set contained a non-blood card.");
      }
    }
    for (const playerCard of player.currentSandCards) {
      if (playerCard.card.suit !== CardSuit.SAND) {
        throw new Error("Player sand card set contained a non-sand card.");
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
