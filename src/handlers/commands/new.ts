import {
  GameController,
  InteractionController,
  SessionController,
} from "..";
import {
  DiscordCommandInteraction,
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
    let createSession: boolean = false;
    if (session !== null && (session.status === SessionStatus.ACTIVE || session.status === SessionStatus.PENDING)) {
      createSession = await InteractionController.promptEndCurrentGame(interaction);
    } else {
      createSession = true;
      await InteractionController.informStartingGame(interaction);
    }
    if (createSession) {
      const newGameMembersResponse: DiscordUser[] | undefined = await InteractionController.promptNewGameMembers(
        interaction.channelId,
        interaction.user,
      );
      if (newGameMembersResponse !== undefined) {
        const session: SessionState = SessionController.createSession(
          interaction.channelId,
          newGameMembersResponse,
          6,
        );
        GameController.startGame(session);
        await InteractionController.announceTurnStart(session);
      }
    }
  },
};
