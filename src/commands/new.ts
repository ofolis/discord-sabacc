import {
  DataController,
  GameController,
  InteractionController,
} from "../controllers";
import { Command, UserInteraction } from "../core";
import { ChannelState } from "../saveables";

export class New implements Command {
  public readonly description = "Start a new game.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "new";

  public async execute(userInteraction: UserInteraction): Promise<void> {
    let channelState: ChannelState | null = DataController.loadChannelState(
      userInteraction.channelId,
    );

    // Determine if a game should be created
    let createGame: boolean = false;
    if (channelState === null || channelState.session === null) {
      createGame = true;
      await InteractionController.informGameCreated(userInteraction);
    } else {
      const promptResult: boolean | null =
        await InteractionController.promptEndCurrentGame(userInteraction);
      if (promptResult !== null) {
        createGame = promptResult;
        if (promptResult) {
          await InteractionController.informGameReplaced(userInteraction);
        } else {
          await InteractionController.informGameNotReplaced(userInteraction);
        }
      }
    }

    // Create the new game if necessary
    if (createGame) {
      if (channelState === null) {
        channelState = new ChannelState(userInteraction.channelId);
      }
      channelState.createSession(userInteraction.discordUser, 6);
      GameController.startGame(channelState);
    }
  }
}
