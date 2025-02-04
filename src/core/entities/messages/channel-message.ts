import * as discordJs from "discord.js";
import { Message } from ".";
import { Log } from "../..";

export class ChannelMessage extends Message {
  private __channelId: string;

  public get channelId(): string {
    return this.__channelId;
  }

  public constructor(
    currentEntity: discordJs.Message | discordJs.InteractionResponse,
    channelId: string,
  ) {
    super(currentEntity);
    this.__channelId = channelId;
    Log.debug("Channel message context added.");
  }
}
