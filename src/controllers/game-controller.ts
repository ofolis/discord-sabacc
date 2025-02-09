import * as discordJs from "discord.js";
import { DataController, InteractionController } from ".";
import { ChannelCommandMessage } from "../core";
import { TurnAction } from "../enums";
import { ChannelState } from "../saveables";

export class GameController {
  private static __startGame(channelState: ChannelState): void {
    channelState.session.startGame();
    channelState.session.resetDecks();
    channelState.session.dealCardsToPlayers();
  }

  public static async handleNewGame(
    message: ChannelCommandMessage,
    channelState: ChannelState | null,
  ): Promise<void> {
    // Determine if new game should be created
    let createGame: boolean = false;
    if (channelState === null) {
      createGame = true;
      await InteractionController.followupGameCreated(message);
    } else {
      const endGameDecision: boolean | null =
        await InteractionController.promptEndCurrentGame(message);
      if (endGameDecision !== null) {
        createGame = endGameDecision;
      }
    }

    // Bail if no game should be created
    if (!createGame) {
      return;
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

}
