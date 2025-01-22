import { Command } from "../core";
import type { DiscordCommandInteraction } from "../core/discord";

export class Info implements Command {
  public readonly description = "View your hand and see game info.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "info";

  public async execute(interaction: DiscordCommandInteraction): Promise<void> {}
}
