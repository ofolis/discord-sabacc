import {
  BaseMessageOptions,
  ButtonInteraction,
  Collection,
  CollectorFilter,
  CommandInteraction,
  ComponentType,
  InteractionResponse,
  Message,
  MessageComponentInteraction,
} from "discord.js";
import { Log } from "../..";

export class ChannelMessage {
  private __currentEntity:
    | CommandInteraction
    | InteractionResponse
    | Message
    | MessageComponentInteraction;

  protected _buttonInteractionFilter:
    | CollectorFilter<
        [ButtonInteraction, Collection<string, ButtonInteraction>]
      >
    | undefined;

  protected _channelId: string;

  public get channelId(): string {
    return this._channelId;
  }

  public constructor(
    currentEntity: Message | InteractionResponse,
    channelId: string,
  ) {
    this.__currentEntity = currentEntity;
    this._channelId = channelId;
    Log.debug("Interaction constructed.");
  }

  public async awaitButtonInteraction(
    timeout: number = 60000,
  ): Promise<ButtonInteraction | null> {
    if (
      !(this.__currentEntity instanceof InteractionResponse) &&
      !(this.__currentEntity instanceof Message)
    ) {
      Log.throw(
        "Cannot await button interaction. Current entity is not an interaction response or message.",
        this.__currentEntity,
      );
    }
    Log.debug("Awaiting Discord button interaction...", { timeout });
    try {
      const buttonInteraction: ButtonInteraction =
        await this.__currentEntity.awaitMessageComponent<ComponentType.Button>({
          componentType: ComponentType.Button,
          filter: this._buttonInteractionFilter,
          time: timeout,
        });
      Log.debug(
        "Discord button interaction retrieved successfully.",
        buttonInteraction,
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

  public async update(options: BaseMessageOptions): Promise<void> {
    Log.debug("Updating Discord message...", options);
    if (
      this.__currentEntity instanceof InteractionResponse ||
      this.__currentEntity instanceof Message
    ) {
      await this.__currentEntity.edit(options);
    } else if (this.__currentEntity instanceof MessageComponentInteraction) {
      this.__currentEntity = await this.__currentEntity.update(options);
    } else {
      Log.throw(
        "Cannot update message. Current entity is not an interaction response, message, or message component interaction.",
        this.__currentEntity,
      );
    }
    Log.debug("Discord message updated successfully.");
  }
}
