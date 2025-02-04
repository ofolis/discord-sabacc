import * as discordJs from "discord.js";
import { TOKEN_MAXIMUM, TOKEN_MINIMUM } from "../constants";
import {
  DataController,
  GameController,
  InteractionController,
} from "../controllers";
import {
  ChannelCommandMessage,
  Command,
  CommandOption,
  CommandOptionType,
} from "../core";
import { ChannelState } from "../saveables";

export class New implements Command {
  public readonly description: string = "Start a new game.";

  public readonly isGlobal: boolean = false;

  public readonly isGuild: boolean = true;

  public readonly isPrivate: boolean = true;

  public readonly name: string = "new";

  public readonly options: CommandOption[] = [
    {
      description: "The starting token total for each player.",
      isRequired: false,
      maxValue: TOKEN_MAXIMUM,
      minValue: TOKEN_MINIMUM,
      name: "tokens",
      type: CommandOptionType.INTEGER,
    },
  ];

  public async execute(message: ChannelCommandMessage): Promise<void> {
    let channelState: ChannelState | null = DataController.loadChannelState(
      message.channelId,
    );

    // Determine if a game should be created
    let createGame: boolean = false;
    if (channelState === null) {
      createGame = true;
      await InteractionController.followupGameCreated(message);
    } else {
      const endGameDecision: boolean | null =
        await InteractionController.promptEndCurrentGame(message);
      if (endGameDecision !== null) {
        createGame = endGameDecision;
      }
    }

    // Create the new game if necessary
    if (createGame) {
      if (channelState === null) {
        channelState = new ChannelState(message);
      } else {
        channelState.createSession(message);
      }
      const joinedUsers: discordJs.User[] | null =
        await InteractionController.promptJoinGame(message);
      if (joinedUsers !== null) {
        channelState.session.addPlayers(joinedUsers);
        GameController.startGame(channelState);
      }
    }
  }
}
