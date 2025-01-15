import { GameController, InteractionController, SessionController } from "..";
import { Command } from "../../core";
import {
  DiscordButtonInteraction,
  DiscordCommandInteraction,
  DiscordMessageComponentInteraction,
  DiscordUser,
} from "../../core/discord";
import { SessionStatus } from "../../enums";
import type { SessionState } from "../../types";

export class NewCommand implements Command {
  public readonly description = "Start a new game.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "new";

  public async execute(interaction: DiscordCommandInteraction): Promise<void> {
    const session: SessionState | null = SessionController.loadSession(
      interaction.channelId,
    );
    let currentInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction = interaction;
    let createSession: boolean = false;

    if (session === null || session.status === SessionStatus.COMPLETED) {
      createSession = true;
    } else {
      const endCurrentGameResponse: DiscordButtonInteraction | null =
        await InteractionController.promptEndCurrentGame(interaction);
      if (endCurrentGameResponse !== null) {
        currentInteraction = endCurrentGameResponse;
        createSession = true;
      }
    }

    if (createSession) {
      await InteractionController.informStartedGame(currentInteraction);
      const newGameMembersResponse: DiscordUser[] | null =
        await InteractionController.promptNewGameMembers(
          interaction.channelId,
          interaction.user,
        );
      if (newGameMembersResponse !== null) {
        const newSession: SessionState = SessionController.createSession(
          interaction.channelId,
          newGameMembersResponse,
          6,
        );
        await GameController.startGame(newSession);
        SessionController.saveSession(newSession);
      }
    }
  }
}
