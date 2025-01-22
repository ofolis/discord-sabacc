import { Command } from "../core";
import { DiscordCommandInteraction } from "../core/discord";

export class New implements Command {
  public readonly description = "Start a new game.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "new";

  public async execute(interaction: DiscordCommandInteraction): Promise<void> {}
}
