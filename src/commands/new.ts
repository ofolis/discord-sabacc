import { User } from "discord.js";
import { TOKEN_MAXIMUM, TOKEN_MINIMUM } from "../constants";
import {
  DataController,
  GameController,
  InteractionController,
} from "../controllers";
import {
  Command,
  CommandOption,
  CommandOptionType,
  PrivateChannelMessage,
} from "../core";
import { ChannelState } from "../saveables";

export class New implements Command {
  public readonly description: string = "Start a new game.";

  public readonly isGlobal: boolean = false;

  public readonly isGuild: boolean = true;

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

  public async execute(
    privateChannelMessage: PrivateChannelMessage,
  ): Promise<void> {
    let channelState: ChannelState | null = DataController.loadChannelState(
      privateChannelMessage.channelId,
    );

    // Determine if a game should be created
    let createGame: boolean = false;
    if (channelState === null) {
      createGame = true;
      await InteractionController.followupGameCreated(privateChannelMessage);
    } else {
      const endGameDecision: boolean | null =
        await InteractionController.promptEndCurrentGame(privateChannelMessage);
      if (endGameDecision !== null) {
        createGame = endGameDecision;
      }
    }

    // Create the new game if necessary
    if (createGame) {
      if (channelState === null) {
        channelState = new ChannelState(privateChannelMessage);
      } else {
        channelState.createSession(privateChannelMessage);
      }
      const joinedUsers: User[] | null =
        await InteractionController.promptJoinGame(privateChannelMessage);
      if (joinedUsers !== null) {
        channelState.session.addPlayers(joinedUsers);
        GameController.startGame(channelState);
      }
    }
  }
}
