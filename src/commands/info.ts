import { DataController, InteractionController } from "../controllers";
import { Command, UserInteraction } from "../core";
import { SessionStatus } from "../enums";
import { ChannelState, Player } from "../saveables";

export class Info implements Command {
  public readonly description = "View your hand and see game info.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "info";

  public async execute(userInteraction: UserInteraction): Promise<void> {
    await userInteraction.deferReply();

    const channelState: ChannelState | null = DataController.loadChannelState(
      userInteraction.channelId,
    );

    // Check for active game
    if (
      channelState === null ||
      channelState.session.status !== SessionStatus.ACTIVE
    ) {
      await InteractionController.informNoGame(userInteraction);
      return;
    }

    const player: Player | null = channelState.session.getPlayerById(
      userInteraction.userId,
    );

    // Check if playing
    if (player === null) {
      await InteractionController.informNotPlaying(userInteraction);
      return;
    }

    // Send info
    await InteractionController.informPlayerInfo(
      userInteraction,
      channelState.session,
      player,
    );
  }
}
