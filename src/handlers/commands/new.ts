import {
  GameController,
  InteractionController,
  SessionController,
} from "..";
import {
  DiscordButtonInteraction,
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
    let createSession: boolean | undefined;
    if (session !== null && (session.status === SessionStatus.ACTIVE || session.status === SessionStatus.PENDING)) {
      // TODO: finish moving the follow-up actions in here from the end game prompt (and there was one other?) because the interaction controller methods that were changed to return the cancel button interaction no longer delete the original message or "inform starting game" on "end game" press
      const endCurrentGameResponse: [DiscordButtonInteraction, boolean] | undefined = await InteractionController.promptEndCurrentGame(interaction);
      if (!endCurrentGameResponse?.[1]) {
        return;
      }
      InteractionController.informStartingGame(discordInteraction);
    } else {
      createSession = true;
      await InteractionController.informStartingGame(interaction);
    }
    if (createSession === true) {
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
        await GameController.startGame(session);
        await InteractionController.announceTurnStarted(session);
      }
    }
  },
};
