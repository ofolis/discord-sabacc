import * as discordJs from "discord.js";
import { DataController, InteractionController } from ".";
import { ChannelCommandMessage, Environment, Log } from "../core";
import {
  CardSuit,
  CardType,
  DrawSource,
  GameStatus,
  TurnAction,
} from "../enums";
import { ChannelState, PlayerCard, Turn } from "../saveables";
import { Card } from "../types";

export class GameController {
  public static async handleNewGame(
    message: ChannelCommandMessage,
    channelState: ChannelState | null,
  ): Promise<void> {
    // Ensure channel state exists with a new session
    if (
      channelState === null ||
      channelState.session.gameStatus === GameStatus.COMPLETED
    ) {
      if (channelState === null) {
        channelState = new ChannelState(message);
      } else {
        channelState.createSession(message);
      }
      await InteractionController.followupGameCreated(message);
    } else {
      const endCurrentGame: true | null | undefined =
        await InteractionController.promptEndCurrentGame(message);
      if (endCurrentGame === null || endCurrentGame === undefined) {
        if (endCurrentGame === null) {
          await InteractionController.followupGameNotEnded(message);
        }
        return;
      }
      channelState.createSession(message);
      await InteractionController.followupGameEnded(message);
    }

    // Prompt for players to join
    const joinedUsers: discordJs.User[] | undefined =
      await InteractionController.promptJoinGame(message);
    if (joinedUsers === undefined) {
      return;
    }

    // Add players and start game
    channelState.session.addPlayers(joinedUsers);
    await this.__startGame(channelState);

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
      if (channelState.session.roundIndex < 3) {
        const turnAction: TurnAction | null | undefined =
          await InteractionController.promptChooseTurnAction(
            message,
            channelState,
          );
        if (turnAction === null || turnAction === undefined) {
          if (turnAction === null) {
            await InteractionController.followupTurnIncomplete(message);
          }
          return;
        }
        turn = channelState.session.createRoundTurnForCurrentPlayer(turnAction);
      } else {
        turn = channelState.session.createRoundTurnForCurrentPlayer(
          TurnAction.REVEAL,
        );
      }
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
    }

    // End turn if resolved
    if (turnResolved) {
      channelState.session.resolveRoundTurnForCurrentPlayer();
      await InteractionController.followupTurnComplete(message);
      await this.__endTurn(channelState);
    }

    // Save at happy path end
    DataController.saveChannelState(channelState);
  }

  private static async __endTurn(channelState: ChannelState): Promise<void> {
    // Get current turn
    const turn: Turn | null = channelState.session.currentPlayer.roundTurn;
    if (turn === null) {
      Log.throw(
        "Cannot end turn. No round turn exists on the current player.",
        { currentPlayer: channelState.session.currentPlayer },
      );
    }

    // Announce turn result
    switch (turn.action) {
      case TurnAction.DRAW:
        await InteractionController.announceTurnDraw(channelState);
        break;
      case TurnAction.REVEAL:
        await InteractionController.announceTurnReveal(channelState);
        break;
      case TurnAction.STAND:
        await InteractionController.announceTurnStand(channelState);
        break;
      default:
        Log.throw("Cannot handle play turn. Unknown turn action.", {
          turnAction: turn.action,
          player: channelState.session.currentPlayer,
        });
    }

    // If all players have played, handle round conclusion
    if (
      channelState.session.activePlayerIndex ===
      channelState.session.activePlayersInTurnOrder.length - 1
    ) {
      await this.__handleRoundEnd(channelState);

      // If game has concluded, stop here
      if (channelState.session.gameStatus === GameStatus.COMPLETED) {
        await this.__handleGameEnd(channelState);
        return;
      }
    }

    channelState.session.iterate();

    // If the first player is up, handle new round
    if (channelState.session.activePlayerIndex === 0) {
      await this.__handleRoundStart(channelState);
    }

    // Start next turn
    await this.__handleTurnStart(channelState);
  }

  private static async __handleGameEnd(
    channelState: ChannelState,
  ): Promise<void> {
    await InteractionController.announceGameEnd(channelState);
  }

  private static async __handleHandEnd(
    channelState: ChannelState,
  ): Promise<void> {
    channelState.session.finalizeHand();
    await InteractionController.announceHandEnd(channelState);
  }

  private static async __handleHandStart(
    channelState: ChannelState,
  ): Promise<void> {
    channelState.session.initializeHand();
    await InteractionController.announceHandStart(channelState);
  }

  private static async __handleImposterCard(
    message: ChannelCommandMessage,
    channelState: ChannelState,
    playerCard: PlayerCard,
  ): Promise<boolean> {
    if (playerCard.dieRolls.length === 0) {
      const rollDice: true | null | undefined =
        await InteractionController.promptRollDice(
          message,
          channelState,
          playerCard,
        );
      if (rollDice === null || rollDice === undefined) {
        if (rollDice === null) {
          await InteractionController.followupTurnIncomplete(message);
        }
        return false;
      }
      // TODO: Sort die rolls
      channelState.session.setPlayerCardDieRollsForCurrentPlayer(playerCard, [
        Environment.random.die(6),
        Environment.random.die(6),
      ]);
    }

    if (playerCard.dieRolls.length > 1) {
      const selectedDieRoll: number | undefined =
        await InteractionController.promptChooseDieRoll(
          message,
          channelState,
          playerCard,
        );
      if (selectedDieRoll === undefined) return false;
      channelState.session.setPlayerCardDieRollsForCurrentPlayer(playerCard, [
        selectedDieRoll,
      ]);
    }

    return true;
  }

  private static async __handleRoundEnd(
    channelState: ChannelState,
  ): Promise<void> {
    // If the last round has ended, handle hand conclusion
    if (channelState.session.roundIndex === 3) {
      await this.__handleHandEnd(channelState);
    }
  }

  private static async __handleRoundStart(
    channelState: ChannelState,
  ): Promise<void> {
    channelState.session.clearPlayerRoundTurns();
    if (channelState.session.roundIndex === 0) {
      await this.__handleHandStart(channelState);
    } else {
      await InteractionController.announceRoundStart(channelState);
    }
  }

  private static async __handleTurnStart(
    channelState: ChannelState,
  ): Promise<void> {
    await InteractionController.announceTurnStart(channelState);
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
      const drawDeck: [CardSuit, DrawSource] | null | undefined =
        await InteractionController.promptChooseDrawDeck(message, channelState);
      if (drawDeck === null || drawDeck === undefined) {
        if (drawDeck === null) {
          channelState.session.currentPlayer.discardRoundTurn();
          await this.handlePlayTurn(message, channelState);
        }
        return false;
      }
      drawnCard = channelState.session.drawCardForCurrentPlayer(
        drawDeck[0],
        drawDeck[1],
      );
    }

    if (roundTurn.discardedCard === null) {
      const discardedCard: PlayerCard | undefined =
        await InteractionController.promptChooseDiscardedCard(
          message,
          channelState,
          drawnCard,
        );
      if (discardedCard === undefined) {
        return false;
      }
      channelState.session.discardCardForCurrentPlayer(discardedCard);
    }
    return true;
  }

  private static async __resolveTurnReveal(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<boolean> {
    const revealCards: true | null | undefined =
      await InteractionController.promptRevealCards(message, channelState);
    if (revealCards === null || revealCards === undefined) {
      if (revealCards === null) {
        await InteractionController.followupTurnIncomplete(message);
      }
      return false;
    }

    const playerCards: readonly PlayerCard[] =
      channelState.session.currentPlayer.getCards();
    for (const playerCard of playerCards) {
      if (playerCard.card.type === CardType.IMPOSTER) {
        const imposterCardHandled: boolean = await this.__handleImposterCard(
          message,
          channelState,
          playerCard,
        );
        if (!imposterCardHandled) {
          return false;
        }
      }
    }
    return true;
  }

  private static async __resolveTurnStand(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<boolean> {
    const standConfirmed: boolean | undefined =
      await InteractionController.promptConfirmStand(message, channelState);
    if (standConfirmed === false || standConfirmed === undefined) {
      if (standConfirmed === false) {
        channelState.session.currentPlayer.discardRoundTurn();
        await this.handlePlayTurn(message, channelState);
      }
      return false;
    }
    return true;
  }

  private static async __startGame(channelState: ChannelState): Promise<void> {
    channelState.session.startGame();
    channelState.session.initializeHand();
    await InteractionController.announceGameStart(channelState);
    await this.__handleTurnStart(channelState);
  }
}
