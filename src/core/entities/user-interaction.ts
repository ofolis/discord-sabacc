import {
  BaseMessageOptions,
  ButtonInteraction,
  CommandInteraction,
  ComponentType,
  InteractionResponse,
  User,
} from "discord.js";
import { Log } from "..";

export class UserInteraction {
  public static async create(
    commandInteraction: CommandInteraction,
  ): Promise<UserInteraction> {
    const interactionResponse: InteractionResponse =
      await commandInteraction.deferReply({ ephemeral: true });
    return new UserInteraction(
      commandInteraction.channelId,
      commandInteraction.user,
      interactionResponse,
    );
  }

  private __channelId: string;

  private __currentInteractionResponse: InteractionResponse;

  private __discordUser: User;

  private __userId: string;

  public get channelId(): string {
    return this.__channelId;
  }

  public get discordUser(): User {
    return this.__discordUser;
  }

  public get userId(): string {
    return this.__userId;
  }

  private constructor(
    channelId: string,
    discordUser: User,
    interactionResponse: InteractionResponse,
  ) {
    this.__channelId = channelId;
    this.__currentInteractionResponse = interactionResponse;
    this.__discordUser = discordUser;
    this.__userId = discordUser.id;
  }

  public async awaitButtonInteraction(
    timeout: number = 6000,
  ): Promise<ButtonInteraction | null> {
    try {
      const buttonInteraction: ButtonInteraction =
        await this.__currentInteractionResponse.awaitMessageComponent<ComponentType.Button>(
          {
            componentType: ComponentType.Button,
            filter: (i): boolean => i.user.id === this.userId,
            time: timeout,
          },
        );
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

  public async updateMessage(options: BaseMessageOptions): Promise<void> {
    await this.__currentInteractionResponse.edit(options);
  }
}
