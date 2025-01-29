import { DataController, InteractionController } from "../controllers";
import { Command, PrivateChannelMessage } from "../core";
import { SessionStatus } from "../enums";
import { ChannelState } from "../saveables";

export class Info implements Command {
  public readonly description = "View your hand and see game info.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "info";

  public async execute(
    privateChannelMessage: PrivateChannelMessage,
  ): Promise<void> {
    const channelState: ChannelState | null = DataController.loadChannelState(
      privateChannelMessage.channelId,
    );

    // Check for active game
    if (
      channelState === null ||
      channelState.session.status !== SessionStatus.ACTIVE
    ) {
      await InteractionController.informNoGame(privateChannelMessage);
      return;
    }

    // Check if playing
    if (channelState.session.playerExists(privateChannelMessage.userId)) {
      await InteractionController.informNotPlaying(privateChannelMessage);
      return;
    }

    // Send info
    await InteractionController.informPlayerInfo(
      privateChannelMessage,
      channelState,
      privateChannelMessage.userId,
    );
  }
}
