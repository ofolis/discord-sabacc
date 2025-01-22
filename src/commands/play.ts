import { Command } from "../core";
import { DiscordCommandInteraction } from "../core/discord";

export class Play implements Command {
  public readonly description = "Play your turn.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "play";

  public async execute(interaction: DiscordCommandInteraction): Promise<void> {}
}
