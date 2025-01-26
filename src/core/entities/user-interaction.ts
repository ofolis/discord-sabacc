import {
  BaseMessageOptions,
  ButtonInteraction,
  CommandInteraction,
  ComponentType,
  Message,
  MessageComponentInteraction,
  User,
} from "discord.js";
import { Log } from "..";

export class UserInteraction {
  private __channelId: string;

  private __currentEntity:
    | CommandInteraction
    | MessageComponentInteraction
    | Message
    | null;

  private __discordUser: User;

  private __isDeferred: boolean = false;

  private __userId: string;

  constructor(commandInteraction: CommandInteraction) {
    this.__channelId = commandInteraction.channelId;
    this.__currentEntity = commandInteraction;
    this.__discordUser = commandInteraction.user;
    this.__userId = commandInteraction.user.id;
  }

  public get channelId(): string {
    return this.__channelId;
  }

  public get discordUser(): User {
    return this.__discordUser;
  }

  public get userId(): string {
    return this.__userId;
  }

  public async awaitButtonInteraction(
    timeout: number = 6000,
  ): Promise<ButtonInteraction | null> {
    if (!(this.__currentEntity instanceof Message)) {
      Log.throw(
        "Cannot await button press. User interaction current entity is not a message.",
        this,
      );
    }
    try {
      const buttonInteraction: ButtonInteraction =
        await this.__currentEntity.awaitMessageComponent<ComponentType.Button>({
          componentType: ComponentType.Button,
          filter: (i): boolean => i.user.id === this.userId,
          time: timeout,
        });
      Log.debug(
        "Discord button interaction retrieved successfully.",
        this.__currentEntity,
      );
      this.__currentEntity = buttonInteraction;
      return buttonInteraction;
    } catch (result: unknown) {
      // This method is the best way I found to determine when we time out versus an actual error
      if (result instanceof Error && result.message.endsWith("reason: time")) {
        return null;
      }
      throw result;
    }
  }

  public async deferReply(isPrivate: boolean): Promise<void> {
    if (
      !(this.__currentEntity instanceof CommandInteraction) &&
      !(this.__currentEntity instanceof MessageComponentInteraction)
    ) {
      Log.throw(
        "Cannot defer reply. User interaction current entity is not an interaction.",
        this,
      );
    }
    if (this.__isDeferred) {
      Log.throw(
        "Cannot defer reply. User interaction is already deferred.",
        this,
      );
    }
    await this.__currentEntity.deferReply({
      ephemeral: isPrivate,
    });
    this.__isDeferred = true;
  }

  public async deleteMessage(): Promise<void> {
    if (!(this.__currentEntity instanceof Message)) {
      Log.throw(
        "Cannot delete message. User interaction current entity is not a message.",
        this,
      );
    }
    await this.__currentEntity.delete();
  }

  public async handleReply(
    options: BaseMessageOptions,
    isPrivate: boolean,
  ): Promise<void> {
    if (this.__currentEntity === null) {
      Log.throw(
        "Cannot handle reply. User interaction current entity does not exist (likely deleted).",
      );
    } else if (
      this.__currentEntity instanceof CommandInteraction ||
      this.__currentEntity instanceof MessageComponentInteraction
    ) {
      if (this.__isDeferred) {
        this.__currentEntity = await this.__currentEntity.editReply({
          ...options,
        });
        this.__isDeferred = false;
      } else {
        this.__currentEntity = await this.__currentEntity.reply({
          ...options,
          ephemeral: isPrivate,
          fetchReply: true,
        });
      }
    } else if (this.__currentEntity instanceof Message) {
      this.__currentEntity = await this.__currentEntity.edit(options);
    } else {
      Log.throw(
        "Cannot handle reply. User interaction current entity is an unknown type.",
      );
    }
  }
}
