import { Command, UserInteraction } from "../core";

export class Play implements Command {
  public readonly description = "Play your turn.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "play";

  public async execute(userInteraction: UserInteraction): Promise<void> {
    await userInteraction.deferReply(true);
  }
}
