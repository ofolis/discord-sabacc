import {
  createBloodDeck,
  createSandDeck,
} from "../constants/game/decks";
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
  Log,
} from "../log";
import {
  PlayerCard,
  PlayerState,
  SessionState,
} from "../types";

export class SessionController {
  public static createSession(channelId: string, discordUsers: DiscordUser[], startingTokenTotal: number): SessionState {
    const players: PlayerState[] = discordUsers.map(discordUser => ({
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
    }));

    const session: SessionState = {
      "bloodDeck": createBloodDeck(),
      "bloodDiscard": [
      ],
      channelId,
      "currentHandIndex": 0,
      "currentPlayerIndex": 0,
      "currentRoundIndex": 0,
      "handResults": [
      ],
      players,
      "sandDeck": createSandDeck(),
      "sandDiscard": [
      ],
      startingTokenTotal,
      "status": SessionStatus.PENDING,
    };

    this.saveSession(session);
    return session;
  }

  public static getSessionPlayerById(session: SessionState, playerId: string): PlayerState | null {
    return session.players.find(player => player.id === playerId) ?? null;
  }

  public static loadSession(channelId: string): SessionState | null {
    return IO.loadData(channelId) as SessionState | null;
  }

  public static saveSession(session: SessionState): void {
    IO.saveData(
      session.channelId,
      session,
    );
  }

  public static validatePlayerCard(player: PlayerState, playerCard: PlayerCard): void {
    const cardInWrongSet: boolean = (playerCard.card.suit === CardSuit.BLOOD && player.currentSandCards.includes(playerCard)) ||
      (playerCard.card.suit === CardSuit.SAND && player.currentBloodCards.includes(playerCard));

    if (!player.currentBloodCards.includes(playerCard) && !player.currentSandCards.includes(playerCard) || cardInWrongSet) {
      Log.throw(
        "Player card validation failed. Player does not contain the card or the card is in the wrong set.",
        player,
        playerCard,
      );
    }
  }

  public static validatePlayerCardSets(player: PlayerState): void {
    if (player.currentBloodCards.length === 0 || player.currentSandCards.length === 0) {
      Log.throw(
        "Player card sets validation failed. Player did not contain any blood or sand cards.",
        player,
      );
    }

    player.currentBloodCards.forEach(playerCard => {
      if (playerCard.card.suit !== CardSuit.BLOOD) {
        Log.throw(
          "Player card sets validation failed. Blood card set contained a non-blood card.",
          player,
        );
      }
    });

    player.currentSandCards.forEach(playerCard => {
      if (playerCard.card.suit !== CardSuit.SAND) {
        Log.throw(
          "Player card sets validation failed. Sand card set contained a non-sand card.",
          player,
        );
      }
    });
  }

  public static validateSessionPlayer(session: SessionState, player: PlayerState): void {
    if (!session.players.includes(player)) {
      Log.throw(
        "Session player validation failed. Session does not contain the player.",
        session,
        player,
      );
    }
  }
}
