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
    Log.debug("Handling new game.");
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
      const endCurrentGame: true | undefined = await this.__handlePrompt(
        message,
        () => InteractionController.promptEndCurrentGame(message),
        () => InteractionController.followupGameNotEnded(message),
      );
      if (endCurrentGame === undefined) return;
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
    Log.debug("Handling play turn.");
    // Initialize  turn
    const turn: Turn | null = await this.__initializeTurn(
      message,
      channelState,
    );
    if (turn === null) return;

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
    Log.debug("Ending turn.");
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
    Log.debug("Handling game end.");
    await InteractionController.announceGameEnd(channelState);
  }

  private static async __handleHandEnd(
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Handling hand end.");
    channelState.session.finalizeHand();
    await InteractionController.announceHandEnd(channelState);
  }

  private static async __handleHandStart(
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Handling hand start.");
    channelState.session.initializeHand();
    await InteractionController.announceHandStart(channelState);
  }

  private static async __handleImposterCard(
    message: ChannelCommandMessage,
    channelState: ChannelState,
    playerCard: PlayerCard,
  ): Promise<boolean> {
    Log.debug("Handling imposter card.");
    // Roll dice if not already rolled
    if (playerCard.dieRolls.length === 0) {
      const rollConfirmed: true | undefined = await this.__handlePrompt(
        message,
        () =>
          InteractionController.promptRollDice(
            message,
            channelState,
            playerCard,
          ),
        () => InteractionController.followupTurnIncomplete(message),
      );
      if (rollConfirmed === undefined) return false;
      const dieRolls: number[] = [
        Environment.random.die(6),
        Environment.random.die(6),
      ];
      dieRolls.sort((a, b) => a - b);
      channelState.session.setPlayerCardDieRollsForCurrentPlayer(
        playerCard,
        dieRolls,
      );
    }

    // Choose die roll if necessary
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

  private static async __handlePrompt<T>(
    message: ChannelCommandMessage,
    promptFunc: () => Promise<T | null | undefined>,
    followUpFunc: (message: ChannelCommandMessage) => Promise<void>,
  ): Promise<T | undefined> {
    Log.debug("Handling prompt.");
    const result: T | null | undefined = await promptFunc();
    switch (result) {
      case null:
        await followUpFunc(message);
        return undefined;
      case undefined:
        return undefined;
      default:
        return result;
    }
  }

  private static async __handleRoundEnd(
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Handling round end.");
    // If the last round has ended, end the hnad
    if (channelState.session.roundIndex !== 3) return;
    await this.__handleHandEnd(channelState);
  }

  private static async __handleRoundStart(
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Handling round start.");
    channelState.session.clearPlayerRoundTurns();
    // If this is the first round, start the hand
    if (channelState.session.roundIndex === 0) {
      await this.__handleHandStart(channelState);
    } else {
      await InteractionController.announceRoundStart(channelState);
    }
  }

  private static async __handleTurnStart(
    channelState: ChannelState,
  ): Promise<void> {
    Log.debug("Handling turn start.");
    await InteractionController.announceTurnStart(channelState);
  }

  private static async __initializeTurn(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<Turn | null> {
    Log.debug("Initializing turn.");
    // Handle normal turns separately from reveal turns
    if (channelState.session.roundIndex < 3) {
      const turnAction: TurnAction | undefined = await this.__handlePrompt(
        message,
        () =>
          InteractionController.promptChooseTurnAction(message, channelState),
        () => InteractionController.followupTurnIncomplete(message),
      );
      if (turnAction === undefined) return null;
      return channelState.session.createRoundTurnForCurrentPlayer(turnAction);
    } else {
      return channelState.session.createRoundTurnForCurrentPlayer(
        TurnAction.REVEAL,
      );
    }
  }

  private static async __resolveTurnDraw(
    message: ChannelCommandMessage,
    channelState: ChannelState,
  ): Promise<boolean> {
    Log.debug("Resolving turn draw.");
    const roundTurn: Turn | null = channelState.session.currentPlayer.roundTurn;
    if (roundTurn === null) {
      Log.throw(
        "Cannot resolve turn draw. No round turn exists on the current player.",
        { currentPlayer: channelState.session.currentPlayer },
      );
    }
    if (roundTurn.action !== TurnAction.DRAW) {
      Log.throw("Cannot resolve turn draw. Round turn action is not draw.", {
        roundTurn,
      });
    }

    // Draw card if not already drawn
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

    // Discard card if necessary
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
    Log.debug("Resolving turn reveal.");
    const roundTurn: Turn | null = channelState.session.currentPlayer.roundTurn;
    if (roundTurn === null) {
      Log.throw(
        "Cannot resolve turn reveal. No round turn exists on the current player.",
        { currentPlayer: channelState.session.currentPlayer },
      );
    }
    if (roundTurn.action !== TurnAction.REVEAL) {
      Log.throw(
        "Cannot resolve turn reveal. Round turn action is not reveal.",
        { roundTurn },
      );
    }

    // Confirm reveal
    const revealConfirmed: true | undefined = await this.__handlePrompt(
      message,
      () => InteractionController.promptRevealCards(message, channelState),
      () => InteractionController.followupTurnIncomplete(message),
    );
    if (revealConfirmed === undefined) return false;

    // Handle imposter cards
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
    Log.debug("Resolving turn stand.");
    const roundTurn: Turn | null = channelState.session.currentPlayer.roundTurn;
    if (roundTurn === null) {
      Log.throw(
        "Cannot resolve turn stand. No round turn exists on the current player.",
        { currentPlayer: channelState.session.currentPlayer },
      );
    }
    if (roundTurn.action !== TurnAction.STAND) {
      Log.throw("Cannot resolve turn stand. Round turn action is not stand.", {
        roundTurn,
      });
    }

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
    Log.debug("Starting game.");
    channelState.session.startGame();
    channelState.session.initializeHand();
    await InteractionController.announceGameStart(channelState);
    await this.__handleTurnStart(channelState);
  }
}
