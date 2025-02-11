import * as discordJs from "discord.js";
import { DataController, InteractionController } from ".";
import { ChannelCommandMessage, Log } from "../core";
import { CardSuit, DrawSource, TurnAction } from "../enums";
import { ChannelState, PlayerCard, Turn } from "../saveables";
import { Card } from "../types";

export class GameController {
  private static async __handleEndOfHand(
    channelState: ChannelState,
  ): Promise<void> {
    // TODO: Implement end hand
  }

  private static async __handleEndOfRound(
    channelState: ChannelState,
  ): Promise<void> {
    // TODO: Implement end round
  }

  private static async __handleEndOfTurn(
    channelState: ChannelState,
  ): Promise<void> {
    // TODO: Implement end turn
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

  private static __startGame(channelState: ChannelState): void {
    channelState.session.startGame();
    channelState.session.resetDecks();
    channelState.session.dealCardsToPlayers();
  }

  public static async handleNewGame(
    message: ChannelCommandMessage,
    channelState: ChannelState | null,
  ): Promise<void> {
    // Check if a new game needs to be created
    if (channelState === null) {
      await InteractionController.followupGameCreated(message);
    } else {
      const endCurrentGame: boolean | null =
        await InteractionController.promptEndCurrentGame(message);
      if (endCurrentGame === null) {
        return;
      }
      if (endCurrentGame) {
        await InteractionController.followupGameEnded(message);
      } else {
        await InteractionController.followupGameNotEnded(message);
        return;
      }
    }

    // Ensure channel state exists with a new session
    if (channelState === null) {
      channelState = new ChannelState(message);
    } else {
      channelState.createSession(message);
    }

    // Prompt for players to join
    const joinedUsers: discordJs.User[] | null =
      await InteractionController.promptJoinGame(message);
    if (joinedUsers !== null) {
      channelState.session.addPlayers(joinedUsers);
      this.__startGame(channelState);
      // Save at happy path end
      DataController.saveChannelState(channelState);
    }
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
          });
      }
      if (turnResolved) {
        channelState.session.resolveRoundTurnForCurrentPlayer();
      }
    }

    // End turn if resolved
    if (turnResolved) {
      if (channelState.session.currentPlayerIsLastPlayer) {
        if (channelState.session.roundIndex === 3) {
          await this.__handleEndOfHand(channelState);
        } else {
          await this.__handleEndOfRound(channelState);
        }
      } else {
        await this.__handleEndOfTurn(channelState);
      }
    }

    // Save at happy path end
    DataController.saveChannelState(channelState);
  }
}
