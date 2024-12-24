import {
  DiscordUser,
} from "../discord";
import {
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
  Utils,
} from "../utils";
import {
  createBloodDeck,
  createSandDeck,
} from "../constants/game/decks";

export class SessionController {
  public static addSessionPlayerFromDiscordUser(
    session: SessionState,
    discordUser: DiscordUser,
  ): PlayerState {
    if (session.status !== SessionStatus.PENDING) {
      throw new Error("Attempted to add player to a non-pending session.");
    }
    const player: PlayerState = {
      "currentBloodCards": [
      ],
      "currentPlayedTokenTotal": 0,
      "currentSandCards": [
      ],
      "currentUnplayedTokenTotal": session.startingTokenTotal,
      "id": discordUser.id,
      "globalName": discordUser.globalName,
      "username": discordUser.username,
    };
    session.players.push(player);
    this.saveSession(session);
    return player;
  }

  public static createSession(
    guildId: string,
    channelId: string,
    startingDiscordUser: DiscordUser,
    startingTokenTotal: number,
  ): SessionState {
    // Initialize session
    const startingPlayer: PlayerState = {
      "currentBloodCards": [
      ],
      "currentPlayedTokenTotal": 0,
      "currentSandCards": [
      ],
      "currentUnplayedTokenTotal": startingTokenTotal,
      "id": startingDiscordUser.id,
      "globalName": startingDiscordUser.globalName,
      "username": startingDiscordUser.username,
    };
    const bloodDeck: Card[] = Utils.shuffleArray<Card>(createBloodDeck());
    const sandDeck: Card[] = Utils.shuffleArray<Card>(createSandDeck());
    const session: SessionState = {
      "bloodDeck": bloodDeck,
      "bloodDiscard": [
      ],
      "channelId": channelId,
      "currentPlayerIndex": 0,
      "currentRoundIndex": 0,
      "currentTurnIndex": 0,
      "guildId": guildId,
      "players": [
        startingPlayer,
      ],
      "sandDeck": sandDeck,
      "sandDiscard": [
      ],
      "startingPlayer": startingPlayer,
      "startingTokenTotal": startingTokenTotal,
      "status": SessionStatus.PENDING,
    };
    this.saveSession(session);
    return session;
  }

  public static getSessionPlayerFromDiscordUserId(
    session: SessionState,
    discordUserId: string,
  ): PlayerState | null {
    const player: PlayerState | undefined = session.players.find(player => player.id === discordUserId);
    return player ?? null;
  }

  public static loadSession(
    guildId: string,
    channelId: string,
  ): SessionState | null {
    const loadResult: SessionState | null = IO.loadData(
      `${guildId}${channelId}`,
    ) as SessionState;
    return loadResult;
  }

  public static saveSession(
    session: SessionState,
  ): void {
    IO.saveData(
      `${session.guildId}${session.channelId}`,
      session,
    );
  }

  public static startSession(
    session: SessionState,
  ): void {
    if (session.players.length <= 1) {
      throw new Error("Session did not have enough players to start.");
    }
    session.players = Utils.shuffleArray(session.players);
    for (const player of session.players) {
      player.currentBloodCards.push(Utils.removeTopArrayItem(session.bloodDeck));
      player.currentSandCards.push(Utils.removeTopArrayItem(session.sandDeck));
    }
    session.bloodDiscard.push(Utils.removeTopArrayItem(session.bloodDeck));
    session.sandDiscard.push(Utils.removeTopArrayItem(session.sandDeck));
    session.startedAt = Date.now();
    session.status = SessionStatus.ACTIVE;
    this.saveSession(session);
  }
}
