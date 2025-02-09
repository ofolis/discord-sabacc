import { ChannelCommandMessage, Command, CommandOption } from "../core";

export class Play implements Command {
  public readonly description: string = "Play your turn.";

  public readonly isGlobal: boolean = false;

  public readonly isGuild: boolean = true;

  public readonly isPrivate: boolean = true;

  public readonly name: string = "play";

  public readonly options: CommandOption[] = [];

  public async execute(message: ChannelCommandMessage): Promise<void> {
    // TODO: Implement the play command.
    await message.update({
      content: "Hi!",
    });
  }
}
