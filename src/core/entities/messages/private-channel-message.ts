import {
  ApplicationCommandOptionType,
  CommandInteraction,
  CommandInteractionOption,
  InteractionResponse,
  User,
} from "discord.js";
import { ChannelMessage } from ".";
import { CommandOptionType, CommandOptionTypeMap, Log } from "../..";

export class PrivateChannelMessage extends ChannelMessage {
  public static async create(
    commandInteraction: CommandInteraction,
  ): Promise<PrivateChannelMessage> {
    Log.debug("Deferring command interaction...");
    const interactionResponse: InteractionResponse =
      await commandInteraction.deferReply({ ephemeral: true });
    Log.debug("Command interaction deferred successfully.");
    return new PrivateChannelMessage(
      interactionResponse,
      commandInteraction.channelId,
      commandInteraction.user,
      [...commandInteraction.options.data],
    );
  }

  private __commandOptions: CommandInteractionOption[] | undefined;

  private __user: User;

  public get user(): User {
    return this.__user;
  }

  private constructor(
    interactionResponse: InteractionResponse,
    channelId: string,
    user: User,
    commandOptions?: CommandInteractionOption[],
  ) {
    super(interactionResponse, channelId);
    this.__commandOptions = commandOptions;
    this.__user = user;
    this._buttonInteractionFilter = (i): boolean =>
      i.user.id === this.__user.id;
    Log.debug("User channel interaction constructed.");
  }

  public getCommandOption<T extends CommandOptionType>(
    name: string,
    type: T,
  ): CommandOptionTypeMap[T] {
    if (this.__commandOptions === undefined) {
      Log.throw(
        "Cannot get command option. Command options have not been set.",
        this,
      );
    }
    const option: CommandInteractionOption | undefined =
      this.__commandOptions.find(opt => opt.name === name);
    if (option === undefined || option.value === undefined) {
      Log.throw(
        "Cannot get command option. No valid option found.",
        { name, option },
        this,
      );
    }
    const isValidType: boolean =
      (type === CommandOptionType.BOOLEAN &&
        option.type === ApplicationCommandOptionType.Boolean &&
        typeof option.value === "boolean") ||
      (type === CommandOptionType.INTEGER &&
        option.type === ApplicationCommandOptionType.Integer &&
        typeof option.value === "number") ||
      (type === CommandOptionType.NUMBER &&
        option.type === ApplicationCommandOptionType.Number &&
        typeof option.value === "number") ||
      (type === CommandOptionType.STRING &&
        option.type === ApplicationCommandOptionType.String &&
        typeof option.value === "string");
    if (!isValidType) {
      Log.throw("Cannot get command option. Type mismatch.", {
        expectedType: type,
        receivedData: option,
      });
    }
    return option.value as CommandOptionTypeMap[T];
  }
}
