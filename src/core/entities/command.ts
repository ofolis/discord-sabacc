import { PrivateChannelMessage } from ".";
import { CommandOption } from "../types";

export abstract class Command {
  abstract description: string;

  abstract isGlobal: boolean;

  abstract isGuild: boolean;

  abstract name: string;

  abstract options: CommandOption[];

  abstract execute(privateChannelMessage: PrivateChannelMessage): Promise<void>;
}
