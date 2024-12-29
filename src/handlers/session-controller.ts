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
          "currentUnspentTokenTotal": startingTokenTotal,
          "id": discordUser.id,
          "globalName": discordUser.globalName,
          "username": discordUser.username,
        };
      },
    );
    const bloodDeck: Card[] = Utils.shuffleArray<Card>(createBloodDeck());
    const sandDeck: Card[] = Utils.shuffleArray<Card>(createSandDeck());
    const session: SessionState = {
      "bloodDeck": bloodDeck,
      "bloodDiscard": [
      ],
      "channelId": channelId,
      "currentHandIndex": 0,
      "currentPlayerIndex": 0,
      "currentRoundIndex": 0,
      "players": players,
      "sandDeck": sandDeck,
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
    const loadResult: SessionState | null = IO.loadData(channelId) as SessionState;
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
}
