import { createBloodDeck, createSandDeck } from "../../constants";
import { IO, Log } from "../../core";
import { DiscordUser } from "../../core/discord";
import { CardSuit, SessionStatus } from "../../enums";
import { ChannelState, Player, PlayerCard, Session } from "../../types";

export class DataController {
  public static addSessionPlayers(
    session: Session,
    discordUsers: DiscordUser[],
  ): void {
    const players: Player[] = discordUsers.map((discordUser) => {
      return {
        avatarId: discordUser.avatar,
        currentBloodCards: [],
        currentSandCards: [],
        currentSpentTokenTotal: 0,
        currentTokenTotal: session.startingTokenTotal,
        currentTurnRecord: null,
        id: discordUser.id,
        isEliminated: false,
        globalName: discordUser.globalName,
        handResults: [],
        username: discordUser.username,
      };
    });
    session.players.push(...players);
  }

  public static createChannelState(
    channelId: string,
    session: Session,
  ): ChannelState {
    return {
      channelId,
      latestGameCompletedAt: null,
      latestGameStartedAt: null,
      session,
      totalGamesCompleted: 0,
      totalGamesStarted: 0,
    };
  }

  public static createSession(
    channelId: string,
    startingDiscordUser: DiscordUser,
    startingTokenTotal: number,
  ): Session {
    const startingPlayer: Player = {
      avatarId: startingDiscordUser.avatar,
      currentBloodCards: [],
      currentSandCards: [],
      currentSpentTokenTotal: 0,
      currentTokenTotal: startingTokenTotal,
      currentTurnRecord: null,
      id: startingDiscordUser.id,
      isEliminated: false,
      globalName: startingDiscordUser.globalName,
      handResults: [],
      username: startingDiscordUser.username,
    };

    const session: Session = {
      bloodDeck: createBloodDeck(),
      bloodDiscard: [],
      channelId,
      currentHandIndex: 0,
      currentPlayerIndex: 0,
      currentRoundIndex: 0,
      handResults: [],
      players: [startingPlayer],
      sandDeck: createSandDeck(),
      sandDiscard: [],
      startingPlayer,
      startingTokenTotal,
      status: SessionStatus.PENDING,
    };

    return session;
  }

  public static getSessionPlayerById(
    session: Session,
    playerId: string,
  ): Player | null {
    return session.players.find((player) => player.id === playerId) ?? null;
  }

  public static loadChannelState(channelId: string): ChannelState | null {
    return IO.loadData(channelId) as ChannelState | null;
  }

  public static saveChannelState(channelState: ChannelState): void {
    IO.saveData(channelState.channelId, channelState);
  }

  public static validatePlayerCard(
    player: Player,
    playerCard: PlayerCard,
  ): void {
    const cardInWrongSet: boolean =
      (playerCard.card.suit === CardSuit.BLOOD &&
        player.currentSandCards.includes(playerCard)) ||
      (playerCard.card.suit === CardSuit.SAND &&
        player.currentBloodCards.includes(playerCard));

    if (
      (!player.currentBloodCards.includes(playerCard) &&
        !player.currentSandCards.includes(playerCard)) ||
      cardInWrongSet
    ) {
      Log.throw(
        "Player card validation failed. Player does not contain the card or the card is in the wrong set.",
        player,
        playerCard,
      );
    }
  }

  public static validatePlayerCardSets(player: Player): void {
    if (
      player.currentBloodCards.length === 0 ||
      player.currentSandCards.length === 0
    ) {
      Log.throw(
        "Player card sets validation failed. Player did not contain any blood or sand cards.",
        player,
      );
    }

    player.currentBloodCards.forEach((playerCard) => {
      if (playerCard.card.suit !== CardSuit.BLOOD) {
        Log.throw(
          "Player card sets validation failed. Blood card set contained a non-blood card.",
          player,
        );
      }
    });

    player.currentSandCards.forEach((playerCard) => {
      if (playerCard.card.suit !== CardSuit.SAND) {
        Log.throw(
          "Player card sets validation failed. Sand card set contained a non-sand card.",
          player,
        );
      }
    });
  }

  public static validateSessionPlayer(session: Session, player: Player): void {
    if (!session.players.includes(player)) {
      Log.throw(
        "Session player validation failed. Session does not contain the player.",
        session,
        player,
      );
    }
  }
}
