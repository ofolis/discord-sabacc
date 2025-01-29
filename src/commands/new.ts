import {
  DataController,
  GameController,
  InteractionController,
} from "../controllers";
import { Command, PrivateChannelMessage } from "../core";
import { DiscordUser } from "../core/discord";
import { ChannelState } from "../saveables";

export class New implements Command {
  public readonly description = "Start a new game.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "new";

  public async execute(
    privateChannelMessage: PrivateChannelMessage,
  ): Promise<void> {
    let channelState: ChannelState | null = DataController.loadChannelState(
      privateChannelMessage.channelId,
    );

    // Determine if a game should be created
    let createGame: boolean = false;
    if (channelState === null) {
      createGame = true;
      await InteractionController.followupGameCreated(privateChannelMessage);
    } else {
      const endGameDecision: boolean | null =
        await InteractionController.promptEndCurrentGame(privateChannelMessage);
      if (endGameDecision !== null) {
        createGame = endGameDecision;
      }
    }

    // Create the new game if necessary
    if (createGame) {
      if (channelState === null) {
        channelState = new ChannelState(privateChannelMessage);
      }
      channelState.createSession(privateChannelMessage);
      const joinedUsers: DiscordUser[] | null =
        await InteractionController.promptJoinGame(privateChannelMessage);
      if (joinedUsers !== null) {
        channelState.session.addPlayers(joinedUsers);
        GameController.startGame(channelState);
      }
    }
  }
}
