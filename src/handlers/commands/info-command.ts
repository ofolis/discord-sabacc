import { DataController, InteractionController } from "..";
import { Command } from "../../core";
import type { DiscordCommandInteraction } from "../../core/discord";
import { SessionStatus } from "../../enums";
import type { ChannelState, Player } from "../../types";

export class InfoCommand implements Command {
  public readonly description = "View your hand and see game info.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "info";

  public async execute(interaction: DiscordCommandInteraction): Promise<void> {
    const channelState: ChannelState | null = DataController.loadChannelState(
      interaction.channelId,
    );
    if (
      channelState === null ||
      channelState.session.status !== SessionStatus.ACTIVE
    ) {
      await InteractionController.informNoGame(interaction);
      return;
    }

    const player: Player | null = DataController.getSessionPlayerById(
      channelState.session,
      interaction.user.id,
    );
    if (player === null) {
      await InteractionController.informNotPlaying(interaction);
      return;
    }

    await InteractionController.informPlayerInfo(
      channelState.session,
      player,
      interaction,
    );
  }
}
