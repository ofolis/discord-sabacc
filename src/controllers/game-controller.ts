import * as discordJs from "discord.js";
import { DataController, InteractionController } from ".";
import { ChannelCommandMessage, Log } from "../core";
import { CardSuit, DrawSource, SessionStatus, TurnAction } from "../enums";
import { ChannelState, PlayerCard, Turn } from "../saveables";
import { Card } from "../types";

export class GameController {
  private static async __endTurn(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    channelState.session.iteratePlayer();

    // If all players have played, handle round conclusion
    if (channelState.session.activePlayerIndex === 0) {
      await this.__handleRoundEnd(message, channelState);

      // If game has concluded, stop here
      if (channelState.session.status === SessionStatus.COMPLETED) {
        await this.__handleGameEnd(message, channelState);
        return;
      }

      // Otherwise, start a new round
      await this.__handleRoundStart(message, channelState);
    }

    // Start next turn
    await this.__handleTurnStart(message, channelState);
  }

  private static async __handleGameEnd(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    await InteractionController.announceGameEnd(message, channelState);
  }

  private static async __handleHandEnd(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    // TODO: Add invocation of session hand scoring methods here
    await InteractionController.announceHandEnd(message, channelState);
  }

  private static async __handleHandStart(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    // TODO: Add invocation of session hand reset methods here
    await InteractionController.announceHandStart(message, channelState);
  }

  private static async __handleRoundEnd(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    if (channelState.session.roundIndex === 0) {
      await this.__handleHandEnd(message, channelState);
    }
  }

  private static async __handleRoundStart(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    if (channelState.session.roundIndex === 0) {
      await this.__handleHandStart(message, channelState);
    } else {
      await InteractionController.announceRoundStart(message, channelState);
    }
  }

  private static async __handleTurnStart(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    await InteractionController.announceTurnStart(message, channelState);
  }

  private static async __resolveTurnDraw(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<boolean> {
    const roundTurn: Turn | null = channelState.session.currentPlayer.roundTurn;
    if (roundTurn === null) {
      Log.throw(
        "Cannot resolve turn draw. No round turn exists on the current player.",
        { currentPlayer: channelState.session.currentPlayer },
      );
    }

    let drawnCard: Card | null = roundTurn.drawnCard;
    if (drawnCard === null) {
      const drawDeck: [CardSuit, DrawSource] | null =
        await InteractionController.promptChooseDrawDeck(message, channelState);
      if (drawDeck === null) {
        return false;
      }
      drawnCard = channelState.session.drawCardForCurrentPlayer(
        drawDeck[0],
        drawDeck[1],
      );
    }

    if (roundTurn.discardedCard === null) {
      const discardedCard: PlayerCard | null =
        await InteractionController.promptChooseDiscardedCard(
          message,
          channelState,
        );
      if (discardedCard === null) {
        return false;
      }
      channelState.session.discardCardForCurrentPlayer(discardedCard);
    }

    await InteractionController.informTurnComplete(message, channelState);
    await InteractionController.announceTurnDraw(message, channelState);
    return true;
  }

  private static async __resolveTurnReveal(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<boolean> {
    const revealCards: boolean | null =
      await InteractionController.promptRevealCards(message, channelState);
    if (revealCards === null) {
      return false;
    }
    if (!revealCards) {
      await InteractionController.informTurnIncomplete(message, channelState);
      return false;
    }
    await InteractionController.informTurnComplete(message, channelState);
    await InteractionController.announceTurnReveal(message, channelState);
    return true;
  }

  private static async __resolveTurnStand(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<boolean> {
    await InteractionController.informTurnComplete(message, channelState);
    await InteractionController.announceTurnStand(message, channelState);
    return true;
  }

  private static async __startGame(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    channelState.session.startGame();
    channelState.session.resetDecks();
    channelState.session.dealCardsToPlayers();
    await InteractionController.announceGameStart(message, channelState);
  }

  public static async handleNewGame(
    message: ChannelCommandMessage,
    channelState: ChannelState | null,
  ): Promise<void> {
    // Ensure channel state exists with a new session
    if (channelState === null) {
      channelState = new ChannelState(message);
      await InteractionController.followupGameCreated(message);
    } else {
      const endCurrentGame: boolean | null =
        await InteractionController.promptEndCurrentGame(message);
      if (endCurrentGame === null) {
        return;
      }
      if (endCurrentGame) {
        channelState.createSession(message);
        await InteractionController.followupGameEnded(message);
      } else {
        await InteractionController.followupGameNotEnded(message);
        return;
      }
    }

    // Prompt for players to join
    const joinedUsers: discordJs.User[] | null =
      await InteractionController.promptJoinGame(message);
    if (joinedUsers === null) {
      return;
    }

    // Add players and start game
    channelState.session.addPlayers(joinedUsers);
    await this.__startGame(message, channelState);

    // Save at happy path end
    DataController.saveChannelState(channelState);
  }

  public static async handlePlayTurn(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<void> {
    // Get current turn
    let turn: Turn | null = channelState.session.currentPlayer.roundTurn;
    if (turn === null) {
      const turnAction: TurnAction | null =
        await InteractionController.promptChooseTurnAction(
          message,
          channelState,
        );
      if (turnAction === null) {
        return;
      }
      turn = channelState.session.createRoundTurnForCurrentPlayer(turnAction);
    }

    // Resolve turn action if not already resolved
    let turnResolved: boolean = turn.isResolved;
    if (!turnResolved) {
      switch (turn.action) {
        case TurnAction.DRAW:
          turnResolved = await this.__resolveTurnDraw(message, channelState);
          break;
        case TurnAction.REVEAL:
          turnResolved = await this.__resolveTurnReveal(message, channelState);
          break;
        case TurnAction.STAND:
          turnResolved = await this.__resolveTurnStand(message, channelState);
          break;
        default:
          Log.throw("Cannot handle play turn. Unknown turn action.", {
            turnAction: turn.action,
            player: channelState.session.currentPlayer,
          });
      }
      if (turnResolved) {
        channelState.session.resolveRoundTurnForCurrentPlayer();
      }
    }

    // End turn if resolved
    if (turnResolved) {
      await this.__endTurn(message, channelState);
    }

    // Save at happy path end
    DataController.saveChannelState(channelState);
  }
}
