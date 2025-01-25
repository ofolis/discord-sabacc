import { UserInteraction } from ".";

export abstract class Command {
  abstract description: string;

  abstract isGlobal: boolean;

  abstract isGuild: boolean;

  abstract name: string;

  abstract execute(userInteraction: UserInteraction): Promise<void>;
}
