import {
  InteractionController,
  SessionController,
} from "..";
import {
  DiscordCommandInteraction,
} from "../../discord";
import {
  SessionStatus,
} from "../../enums";
import type {
  Command,
  SessionState,
} from "../../types";

export const command: Command = {
  "name": "new",
  "description": "Start a new game.",
  "isGlobal": false,
  "isGuild": true,
  "execute": async(interaction: DiscordCommandInteraction): Promise<void> => {
    const session: SessionState | null = SessionController.loadSession(interaction.channelId);
    let createSession: boolean = false;
    if (session === null) {
      createSession = true;
      await InteractionController.informStartingGame(interaction);
    } else if (session.status !== SessionStatus.ACTIVE) {
      createSession = await InteractionController.promptEndGame(interaction);
    }
    if (createSession) {
      const session: SessionState = SessionController.createSession(
        interaction.channelId,
        interaction.user,
        6,
      );
      await InteractionController.promptJoinGame(session);
    }
  },
};
