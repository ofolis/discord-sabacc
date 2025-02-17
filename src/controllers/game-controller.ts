import * as discordJs from "discord.js";
import { Random } from "random-js";
import { DataController, InteractionController } from ".";
import { ChannelCommandMessage, Log } from "../core";
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
      await this.__endTurn(channelState);
    }

    // Save at happy path end
    DataController.saveChannelState(channelState);
  }

  private static async __endTurn(channelState: ChannelState): Promise<void> {
    channelState.session.iterate();

    // If all players have played, handle round conclusion
    if (channelState.session.activePlayerIndex === 0) {
      await this.__handleRoundEnd(channelState);

      // If game has concluded, stop here
      if (channelState.session.gameStatus === GameStatus.COMPLETED) {
        await this.__handleGameEnd(channelState);
        return;
      }

      // Otherwise, start a new round
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
    channelState.session.scoreHand();
    channelState.session.applyHandResult();

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
    const random: Random = new Random();

    if (playerCard.dieRolls.length === 0) {
      const rollDice: boolean | null =
        await InteractionController.promptRollDice(message, playerCard);
      if (rollDice === null) return false;
      if (!rollDice) {
        await InteractionController.followupTurnIncomplete(message);
        return false;
      }
      channelState.session.setPlayerCardDieRollsForCurrentPlayer(playerCard, [
        random.die(6),
        random.die(6),
      ]);
    }

    if (playerCard.dieRolls.length > 1) {
      const selectedDieRoll: number | null =
        await InteractionController.promptChooseDieRoll(message, playerCard);
      if (selectedDieRoll === null) return false;
      channelState.session.setPlayerCardDieRollsForCurrentPlayer(playerCard, [
        selectedDieRoll,
      ]);
    }

    return true;
  }

  private static async __handleRoundEnd(
    channelState: ChannelState,
  ): Promise<void> {
    if (channelState.session.roundIndex === 0) {
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

    await InteractionController.followupTurnComplete(message);
    await InteractionController.announceTurnDraw(channelState);
    return true;
  }

  private static async __resolveTurnReveal(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<boolean> {
    const revealCards: boolean | null =
      await InteractionController.promptRevealCards(message);
    if (revealCards === null) {
      return false;
    }
    if (!revealCards) {
      await InteractionController.followupTurnIncomplete(message);
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

    await InteractionController.followupTurnComplete(message);
    await InteractionController.announceTurnReveal(channelState);
    return true;
  }

  private static async __resolveTurnStand(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<boolean> {
    await InteractionController.followupTurnComplete(message);
    await InteractionController.announceTurnStand(channelState);
    return true;
  }

  private static async __startGame(channelState: ChannelState): Promise<void> {
    channelState.session.startGame();
    channelState.session.initializeHand();
    await InteractionController.announceGameStart(channelState);
    await this.__handleTurnStart(channelState);
  }
}
