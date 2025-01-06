import {
  GameController,
  InteractionController,
  SessionController,
} from "..";
import {
  DiscordButtonInteraction,
  DiscordCommandInteraction,
  DiscordMessageComponentInteraction,
  DiscordUser,
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
    let currentInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction = interaction;
    let createSession: boolean = false;
    if (session === null || session.status === SessionStatus.COMPLETED) {
      createSession = true;
    } else {
      const endCurrentGameResponse: DiscordButtonInteraction | null = await InteractionController.promptEndCurrentGame(interaction);
      if (endCurrentGameResponse !== null) {
        currentInteraction = endCurrentGameResponse;
        createSession = true;
      }
    }
    if (createSession) {
      await InteractionController.informStartingGame(currentInteraction);
      const newGameMembersResponse: DiscordUser[] | null = await InteractionController.promptNewGameMembers(
        interaction.channelId,
        interaction.user,
      );
      if (newGameMembersResponse !== null) {
        const session: SessionState = SessionController.createSession(
          interaction.channelId,
          newGameMembersResponse,
          6,
        );
        await GameController.startGame(session);
      }
    }
  },
};
