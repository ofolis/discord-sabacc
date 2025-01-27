import {
  BaseMessageOptions,
  ButtonInteraction,
  CommandInteraction,
  ComponentType,
  InteractionResponse,
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
    | InteractionResponse;

  private __discordUser: User;

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
    if (
      !(this.__currentEntity instanceof InteractionResponse) &&
      !(this.__currentEntity instanceof Message)
    ) {
      Log.throw(
        "Cannot await button press. User interaction current entity is not an interaction response.",
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
        buttonInteraction,
      );
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
    if (this.__currentEntity.deferred) {
      Log.throw(
        "Cannot defer reply. User interaction has already been deferred.",
        this,
      );
    }
    this.__currentEntity = await this.__currentEntity.deferReply({
      ephemeral: isPrivate,
    });
  }

  public async handleSend(
    options: BaseMessageOptions,
    isPrivate: boolean,
    createNewMessage: boolean,
  ): Promise<void> {
    console.log(createNewMessage);
    if (
      this.__currentEntity instanceof CommandInteraction ||
      this.__currentEntity instanceof MessageComponentInteraction
    ) {
      if (this.__currentEntity.deferred || this.__currentEntity.replied) {
        await this.__currentEntity.editReply({
          ...options,
        });
      } else {
        this.__currentEntity = await this.__currentEntity.reply({
          ...options,
          ephemeral: isPrivate,
        });
      }
    } else if (this.__currentEntity instanceof InteractionResponse) {
      await this.__currentEntity.edit(options);
    } else {
      Log.throw(
        "Cannot handle reply. User interaction current entity is an unknown type.",
      );
    }
  }
}
