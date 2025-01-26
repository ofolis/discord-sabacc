import {
  DataController,
  GameController,
  InteractionController,
} from "../controllers";
import { Command, UserInteraction } from "../core";
import { SessionStatus } from "../enums";
import { ChannelState } from "../saveables";

export class New implements Command {
  public readonly description = "Start a new game.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "new";

  public async execute(userInteraction: UserInteraction): Promise<void> {
    await userInteraction.deferReply(true);

    let channelState: ChannelState | null = DataController.loadChannelState(
      userInteraction.channelId,
    );

    let createGame: boolean = false;
    if (
      channelState === null ||
      channelState.session.status === SessionStatus.COMPLETED
    ) {
      createGame = true;
    } else {
      const promptResult: boolean | null =
        await InteractionController.promptEndCurrentGame(userInteraction);
      if (promptResult !== null) {
        createGame = promptResult;
      }
    }
    if (createGame) {
      await InteractionController.informStartedGame(userInteraction);
      if (channelState === null) {
        channelState = new ChannelState(
          userInteraction.channelId,
          userInteraction.discordUser,
          6,
        );
      } else {
        channelState.createSession(userInteraction.discordUser, 6);
      }
      GameController.startGame(channelState);
    } else {
      await InteractionController.informNotStartedGame(userInteraction);
    }
  }
}
