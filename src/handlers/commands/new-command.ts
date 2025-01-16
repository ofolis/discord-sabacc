import { DataController, GameController, InteractionController } from "..";
import { Command } from "../../core";
import {
  DiscordButtonInteraction,
  DiscordCommandInteraction,
  DiscordMessageComponentInteraction,
  DiscordUser,
} from "../../core/discord";
import { SessionStatus } from "../../enums";
import type { ChannelState, Session } from "../../types";

export class NewCommand implements Command {
  public readonly description = "Start a new game.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "new";

  public async execute(interaction: DiscordCommandInteraction): Promise<void> {
    let channelState: ChannelState | null = DataController.loadChannelState(
      interaction.channelId,
    );
    let currentInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction = interaction;
    let createSession: boolean = false;

    if (
      channelState === null ||
      channelState.session.status === SessionStatus.COMPLETED
    ) {
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
      const session: Session = DataController.createSession(
        interaction.channelId,
        interaction.user,
        6,
      );
      const newGameMembersResponse: DiscordUser[] | null =
        await InteractionController.promptNewGameMembers(session);
      if (newGameMembersResponse !== null) {
        DataController.addSessionPlayers(session, newGameMembersResponse);
        if (channelState === null) {
          channelState = DataController.createChannelState(
            interaction.channelId,
            session,
          );
        } else {
          channelState.session = session;
        }
        await GameController.startGame(channelState.session);
        DataController.saveChannelState(channelState);
      }
    }
  }
}
