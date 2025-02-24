import {
  DataController,
  GameController,
  InteractionController,
} from "../controllers";
import { ChannelCommandMessage, Command, CommandOption } from "../core";
import { GameStatus } from "../enums";
import { ChannelState } from "../saveables";

export class Play implements Command {
  public readonly description: string = "Play your turn.";

  public readonly isGlobal: boolean = false;

  public readonly isGuild: boolean = true;

  public readonly isPrivate: boolean = true;

  public readonly name: string = "play";

  public readonly options: CommandOption[] = [];

  public async execute(message: ChannelCommandMessage): Promise<void> {
    const channelState: ChannelState | null = DataController.loadChannelState(
      message.channelId,
    );

    // Update this user's nickname
    if (channelState !== null) {
      channelState.setUserNickname(message.user.id, message.member.nickname);
    }

    // Check for active game
    if (
      channelState === null ||
      channelState.session.gameStatus !== GameStatus.ACTIVE
    ) {
      await InteractionController.informNoGame(message);
      return;
    }

    // Check if playing
    if (!channelState.session.playerExists(message.user.id)) {
      await InteractionController.informNotPlaying(message);
      return;
    }

    // Check if current turn
    if (channelState.session.currentPlayer.id !== message.user.id) {
      await InteractionController.informNotTurn(message, channelState);
      return;
    }

    // Handle playing turn
    await GameController.handlePlayTurn(message, channelState);
  }
}
