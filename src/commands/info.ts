import { DataController, InteractionController } from "../controllers";
import { Command } from "../core";
import type { DiscordCommandInteraction } from "../core/discord";
import { SessionStatus } from "../enums";
import { ChannelState, Player } from "../saveables";

export class Info implements Command {
  public readonly description = "View your hand and see game info.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "info";

  public async execute(interaction: DiscordCommandInteraction): Promise<void> {
    const channelState: ChannelState | null = DataController.loadChannelState(
      interaction.channelId,
    );
    // Check for active game
    if (
      channelState === null ||
      channelState.session.status !== SessionStatus.ACTIVE
    ) {
      await InteractionController.informNoGame(interaction);
      return;
    }
    // Check if playing
    const player: Player | null = channelState.session.getPlayerById(
      interaction.user.id,
    );
    if (player === null) {
      await InteractionController.informNotPlaying(interaction);
      return;
    }
    // Send info
    await InteractionController.informPlayerInfo(
      interaction,
      channelState.session,
      player,
    );
  }
}
