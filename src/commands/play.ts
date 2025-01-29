import { Command, PrivateChannelMessage } from "../core";

export class Play implements Command {
  public readonly description = "Play your turn.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "play";

  public async execute(
    privateChannelMessage: PrivateChannelMessage,
  ): Promise<void> {
    await privateChannelMessage.update({
      content: "Hi!",
    });
  }
}
