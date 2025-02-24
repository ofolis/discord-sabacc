import { TOKEN_MAXIMUM, TOKEN_MINIMUM } from "../constants";
import { DataController, GameController } from "../controllers";
import {
  ChannelCommandMessage,
  Command,
  CommandOption,
  CommandOptionType,
} from "../core";
import { ChannelState } from "../saveables";

export class New implements Command {
  public readonly description: string = "Start a new game.";

  public readonly isGlobal: boolean = false;

  public readonly isGuild: boolean = true;

  public readonly isPrivate: boolean = true;

  public readonly name: string = "new";

  public readonly options: CommandOption[] = [
    {
      description: "The starting token total for each player.",
      isRequired: false,
      maxValue: TOKEN_MAXIMUM,
      minValue: TOKEN_MINIMUM,
      name: "tokens",
      type: CommandOptionType.INTEGER,
    },
  ];

  public async execute(message: ChannelCommandMessage): Promise<void> {
    const channelState: ChannelState | null = DataController.loadChannelState(
      message.channelId,
    );

    // Update this user's nickname
    if (channelState !== null) {
      channelState.setUserNickname(message.user.id, message.member.nickname);
    }

    // Handle new game creation
    await GameController.handleNewGame(message, channelState);
  }
}
