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
          "currentUnspentTokenTotal": startingTokenTotal,
          "id": discordUser.id,
          "globalName": discordUser.globalName,
          "pendingDiscard": null,
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
