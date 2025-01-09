import { InteractionController, SessionController } from "..";
import { Command } from "../../abstracts";
import type { DiscordCommandInteraction } from "../../discord";
import { SessionStatus } from "../../enums";
import type { PlayerState, SessionState } from "../../types";

export class InfoCommand implements Command {
  public readonly description = "View your hand and see game info.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "info";

  public async execute(interaction: DiscordCommandInteraction): Promise<void> {
    const session: SessionState | null = SessionController.loadSession(
      interaction.channelId,
    );
    if (session === null || session.status !== SessionStatus.ACTIVE) {
      await InteractionController.informNoGame(interaction);
      return;
    }

    const player: PlayerState | null = SessionController.getSessionPlayerById(
      session,
      interaction.user.id,
    );
    if (player === null) {
      await InteractionController.informNotPlaying(interaction);
      return;
    }

    await InteractionController.informPlayerInfo(session, player, interaction);
  }
}
