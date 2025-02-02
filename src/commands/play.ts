import { Command, CommandOption, PrivateChannelMessage } from "../core";

export class Play implements Command {
  public readonly description: string = "Play your turn.";

  public readonly isGlobal: boolean = false;

  public readonly isGuild: boolean = true;

  public readonly name: string = "play";

  public readonly options: CommandOption[] = [];

  public async execute(
    privateChannelMessage: PrivateChannelMessage,
  ): Promise<void> {
    await privateChannelMessage.update({
      content: "Hi!",
    });
  }
}
