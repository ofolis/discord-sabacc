import { DataController, InteractionController } from "../controllers";
import { ChannelCommandMessage, Command, CommandOption } from "../core";
import { ChannelState } from "../entities";
import { SessionStatus } from "../enums";

export class Info implements Command {
  public readonly description: string = "View your hand and see game info.";

  public readonly isGlobal: boolean = false;

  public readonly isGuild: boolean = true;

  public readonly isPrivate: boolean = true;

  public readonly name: string = "info";

  public readonly options: CommandOption[] = [];

  public async execute(message: ChannelCommandMessage): Promise<void> {
    const channelState: ChannelState | null = DataController.loadChannelState(
      message.channelId,
    );

    // Check for active game
    if (
      channelState === null ||
      channelState.session.status !== SessionStatus.ACTIVE
    ) {
      await InteractionController.informNoGame(message);
      return;
    }

    // Check if playing
    if (!channelState.session.playerExists(message.user.id)) {
      await InteractionController.informNotPlaying(message);
      return;
    }

    // Send info
    await InteractionController.informPlayerInfo(
      message,
      channelState,
      message.user.id,
    );
  }
}
