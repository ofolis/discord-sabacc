import { DataController, InteractionController } from "../controllers";
import { Command } from "../core";
import {
  DiscordButtonInteraction,
  DiscordCommandInteraction,
  DiscordMessageComponentInteraction,
  DiscordUser,
} from "../core/discord";
import { SessionStatus } from "../enums";
import { ChannelState, Player, Session } from "../saveables";

export class New implements Command {
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
      const startingTokenTotal: number = 6;
      const startingPlayer: Player = new Player(interaction.user);
      const session: Session = new Session(
        interaction.channelId,
        startingPlayer,
        startingTokenTotal,
      );
      const newGameMembersResponse: DiscordUser[] | null =
        await InteractionController.promptNewGameMembers(session);
      if (newGameMembersResponse !== null) {
        const players: Player[] = newGameMembersResponse.map(
          discordUser => new Player(discordUser),
        );
        session.addPlayers(players);
        if (channelState === null) {
          channelState = new ChannelState(interaction.channelId, session);
        } else {
          channelState.session = session;
        }
        await channelState.session.startGame();
        DataController.saveChannelState(channelState);
      }
    }
  }
}
