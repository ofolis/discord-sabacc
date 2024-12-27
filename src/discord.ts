import {
  ActionRowBuilder,
  ActionRowData,
  APIActionRowComponent,
  APIMessageActionRowComponent,
  ButtonBuilder,
  ButtonInteraction,
  Channel,
  ChannelType,
  Client,
  CollectorFilter,
  CommandInteraction,
  ComponentType,
  InteractionResponse,
  JSONEncodable,
  Message,
  MessageActionRowComponentBuilder,
  MessageActionRowComponentData,
  MessageComponentInteraction,
  REST,
  Routes,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import {
  Constants,
} from "./constants";
import type {
  Command,
} from "./types";

export {
  ButtonBuilder as DiscordButtonBuilder,
  ButtonInteraction as DiscordButtonInteraction,
  ButtonStyle as DiscordButtonStyle,
  CommandInteraction as DiscordCommandInteraction,
  InteractionResponse as DiscordInteractionResponse,
  Message as DiscordMessage,
  User as DiscordUser,
} from "discord.js";

export class Discord {
  private static _client: Client | null = null;

  public static get client(): Client {
    if (this._client === null) {
      this._client = new Client({
        "intents": [
          "DirectMessages",
          "Guilds",
          "GuildMessages",
        ],
      });
    }
    return this._client;
  }

  private static buttonMapToActionRow(
    buttonMap: Record<string, ButtonBuilder>,
  ): ActionRowBuilder<ButtonBuilder> {
    if (Object.keys(buttonMap).length === 0) {
      throw new Error("Button map contained no entries.");
    }
    const buttonRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>();
    for (const customId in buttonMap) {
      const button: ButtonBuilder = buttonMap[customId];
      button.setCustomId(customId);
      buttonRow.addComponents(button);
    }
    return buttonRow;
  }

  private static createComponentsValue(
    buttonMap: Record<string, ButtonBuilder> | undefined = undefined,
  ): (
    | JSONEncodable<APIActionRowComponent<APIMessageActionRowComponent>>
    | ActionRowData<MessageActionRowComponentData | MessageActionRowComponentBuilder>
    | APIActionRowComponent<APIMessageActionRowComponent>
  )[] | undefined {
    if (buttonMap !== undefined) {
      if (Object.keys(buttonMap).length > 0) {
        return [
          this.buttonMapToActionRow(buttonMap),
        ];
      } else {
        return [
        ];
      }
    }
    return undefined;
  }

  private static async deployGlobalCommands(
    rest: REST,
    commandMap: Record<string, Command>,
    builderMap: Record<string, SlashCommandBuilder>,
  ): Promise<void> {
    console.log("Deploying global commands...");
    const commandBuilders: SlashCommandBuilder[] = Object.entries(commandMap)
      .filter(([
        _,
        value,
      ]) => value.isGlobal)
      .map(([
        key,
      ]) => builderMap[key]);
    await rest.put(
      Routes.applicationCommands(Constants.config.discordApplicationId),
      {
        "body": commandBuilders,
      },
    );
    console.log("Successfully deployed global commands.");
  }

  private static async deployGuildCommands(
    rest: REST,
    commandMap: Record<string, Command>,
    builderMap: Record<string, SlashCommandBuilder>,
    guildIds: string[],
  ): Promise<void> {
    console.log("Deploying guild commands...");
    const commandBuilders: SlashCommandBuilder[] = Object.entries(commandMap)
      .filter(([
        _,
        value,
      ]) => value.isGuild)
      .map(([
        key,
      ]) => builderMap[key]);
    const promises: Promise<unknown>[] = guildIds.map(async(guildId: string) => await rest.put(
      Routes.applicationGuildCommands(
        Constants.config.discordApplicationId,
        guildId,
      ),
      {
        "body": commandBuilders,
      },
    ));
    await Promise.all(promises);
    console.log("Successfully deployed guild commands.");
  }

  private static getChannel(
    channelId: string,
  ): TextChannel {
    const channel: Channel | undefined = Discord.client.channels.cache.get(channelId);
    if (channel === undefined) {
      throw new Error(`Channel ${channelId} was not found in the channel cache.`);
    }
    if (channel.type !== ChannelType.GuildText) {
      throw new Error(`Channel ${channelId} was not a guild text channel.`);
    }
    return channel;
  }

  public static async deleteSentItem(
    sentItem: Message  | InteractionResponse,
  ): Promise<void> {
    await sentItem.delete();
  }

  public static async deployCommands(
    commandMap: Record<string, Command>,
    guildIds: string[] | undefined = undefined,
  ): Promise<void> {
    const rest: REST = new REST({
      "version": "10",
    }).setToken(Constants.config.discordBotToken);
    if (guildIds === undefined) {
      guildIds = Array.from(this.client.guilds.cache.keys());
    }
    const builderMap: Record<string, SlashCommandBuilder> = Object.fromEntries(Object.entries(commandMap).map(([
      key,
      value,
    ]) => [
      key,
      new SlashCommandBuilder().setName(value.name).setDescription(value.description),
    ]));
    await this.deployGlobalCommands(
      rest,
      commandMap,
      builderMap,
    );
    await this.deployGuildCommands(
      rest,
      commandMap,
      builderMap,
      guildIds,
    );
  }

  public static async getButtonInteraction(
    context: InteractionResponse | Message,
    filter: CollectorFilter<[MessageComponentInteraction]> | null = null,
    timeout: number = 60000,
  ): Promise<ButtonInteraction | null> {
    try {
      const buttonInteraction: ButtonInteraction = await context.awaitMessageComponent<ComponentType.Button>({
        "componentType": ComponentType.Button,
        "filter": filter ?? undefined,
        "time": timeout,
      });
      return buttonInteraction;
    } catch (result: unknown) {
      // There is no better way I could find to determine which errors are timeouts
      if (result instanceof Error && result.message.endsWith("reason: time")) {
        return null;
      }
      throw result;
    }
  }

  public static async sendInteractionResponse(
    interaction: CommandInteraction | MessageComponentInteraction,
    content: string,
    isPrivate: boolean = false,
    buttonMap: Record<string, ButtonBuilder> | undefined = undefined,
  ): Promise<InteractionResponse> {
    const interactionResponse: InteractionResponse = await interaction.reply({
      "components": this.createComponentsValue(buttonMap),
      "content": content,
      "ephemeral": isPrivate,
    });
    return interactionResponse;
  }

  public static async sendMessage(
    channelId: string,
    content: string,
    buttonMap: Record<string, ButtonBuilder> | undefined = undefined,
  ): Promise<Message> {
    const channel: TextChannel = this.getChannel(channelId);
    const message: Message = await channel.send({
      "components": this.createComponentsValue(buttonMap),
      "content": content,
    });
    return message;
  }

  public static async updateInteractionSourceItem(
    interaction: MessageComponentInteraction,
    content: string,
    buttonMap: Record<string, ButtonBuilder> | undefined = undefined,
  ): Promise<InteractionResponse> {
    return await interaction.update({
      "components": this.createComponentsValue(buttonMap),
      "content": content,
    });
  }

  public static async updateSentItem(
    sentItem: Message  | InteractionResponse,
    content: string,
    buttonMap: Record<string, ButtonBuilder> | undefined = undefined,
  ): Promise<void> {
    await sentItem.edit({
      "components": this.createComponentsValue(buttonMap),
      "content": content,
    });
  }
}
