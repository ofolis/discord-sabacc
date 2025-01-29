import { CommandInteraction, InteractionResponse, User } from "discord.js";
import { ChannelMessage } from ".";
import { Log } from "../..";

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
    );
  }

  private __discordUser: User;

  private __userId: string;

  public get discordUser(): User {
    return this.__discordUser;
  }

  public get userId(): string {
    return this.__userId;
  }

  private constructor(
    interactionResponse: InteractionResponse,
    channelId: string,
    discordUser: User,
  ) {
    super(interactionResponse, channelId);
    this.__discordUser = discordUser;
    this.__userId = discordUser.id;
    this._buttonInteractionFilter = (i): boolean => i.user.id === this.__userId;
    Log.debug("User channel interaction constructed.");
  }
}
