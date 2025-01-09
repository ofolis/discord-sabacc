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
import { Command } from "./abstracts";
import { Environment } from "./environment";
import { Log } from "./log";

export {
  ButtonBuilder as DiscordButtonBuilder,
  ButtonInteraction as DiscordButtonInteraction,
  ButtonStyle as DiscordButtonStyle,
  CommandInteraction as DiscordCommandInteraction,
  InteractionResponse as DiscordInteractionResponse,
  Message as DiscordMessage,
  MessageComponentInteraction as DiscordMessageComponentInteraction,
  User as DiscordUser,
} from "discord.js";

export class Discord {
  private static _client: Client | null = null;

  public static get client(): Client {
    if (this._client === null) {
      this._client = new Client({
        intents: ["DirectMessages", "Guilds", "GuildMessages"],
      });
    }
    return this._client;
  }

  private static buttonMapToActionRow(
    buttonMap: Record<string, ButtonBuilder>,
  ): ActionRowBuilder<ButtonBuilder> {
    if (Object.keys(buttonMap).length === 0) {
      Log.throw(
        "Cannot create Discord action row. Button map contained no entries.",
      );
    }
    const buttonRow: ActionRowBuilder<ButtonBuilder> =
      new ActionRowBuilder<ButtonBuilder>();
    Object.entries(buttonMap).forEach(([customId, button]) => {
      button.setCustomId(customId);
      buttonRow.addComponents(button);
    });
    return buttonRow;
  }

  private static createComponentsValue(
    buttonMap?: Record<string, ButtonBuilder>,
  ):
    | (
        | JSONEncodable<APIActionRowComponent<APIMessageActionRowComponent>>
        | ActionRowData<
            MessageActionRowComponentData | MessageActionRowComponentBuilder
          >
        | APIActionRowComponent<APIMessageActionRowComponent>
      )[]
    | undefined {
    if (buttonMap === undefined) {
      return undefined;
    }
    return Object.keys(buttonMap).length > 0
      ? [this.buttonMapToActionRow(buttonMap)]
      : [];
  }

  private static async deployGlobalCommands(
    rest: REST,
    commandMap: Record<
      string,
      {
        builder: SlashCommandBuilder;
        command: Command;
      }
    >,
  ): Promise<void> {
    const commandBuilders: SlashCommandBuilder[] = Object.values(commandMap)
      .filter((value) => value.command.isGlobal)
      .map((value) => value.builder);
    await rest.put(
      Routes.applicationCommands(Environment.config.discordApplicationId),
      {
        body: commandBuilders,
      },
    );
  }

  private static async deployGuildCommands(
    rest: REST,
    commandMap: Record<
      string,
      {
        builder: SlashCommandBuilder;
        command: Command;
      }
    >,
    guildIds: string[],
  ): Promise<void> {
    const commandBuilders: SlashCommandBuilder[] = Object.values(commandMap)
      .filter((value) => value.command.isGuild)
      .map((value) => value.builder);
    await Promise.all(
      guildIds.map((guildId) =>
        rest.put(
          Routes.applicationGuildCommands(
            Environment.config.discordApplicationId,
            guildId,
          ),
          {
            body: commandBuilders,
          },
        ),
      ),
    );
  }

  private static getChannel(channelId: string): TextChannel {
    const channel: Channel | undefined =
      Discord.client.channels.cache.get(channelId);
    if (channel === undefined) {
      Log.throw(
        "Cannot get Discord channel. ID was not found in the channel cache.",
        channelId,
      );
    }
    if (channel.type !== ChannelType.GuildText) {
      Log.throw(
        "Cannot get Discord channel. Channel at ID was not a guild text channel.",
        channel,
      );
    }
    return channel;
  }

  public static async deleteSentItem(
    sentItem: Message | InteractionResponse,
  ): Promise<void> {
    await sentItem.delete();
  }

  public static async deployCommands(
    commandList: Command[],
    guildIds?: string[],
  ): Promise<void> {
    const rest: REST = new REST({
      version: "10",
    }).setToken(Environment.config.discordBotToken);
    const commandMap: Record<
      string,
      {
        builder: SlashCommandBuilder;
        command: Command;
      }
    > = {};
    commandList.forEach((command) => {
      if (command.name in commandMap) {
        Log.throw(
          "Cannot deploy commands. Command names are not unique.",
          commandMap,
        );
      }
      commandMap[command.name] = {
        builder: new SlashCommandBuilder()
          .setName(command.name)
          .setDescription(command.description),
        command,
      };
    });
    guildIds = guildIds ?? Array.from(this.client.guilds.cache.keys());
    await this.deployGlobalCommands(rest, commandMap);
    await this.deployGuildCommands(rest, commandMap, guildIds);
  }

  public static async getButtonInteraction(
    context: InteractionResponse | Message,
    filter: CollectorFilter<[MessageComponentInteraction]> | null = null,
    timeout = 60000,
  ): Promise<ButtonInteraction | null> {
    try {
      return await context.awaitMessageComponent<ComponentType.Button>({
        componentType: ComponentType.Button,
        filter: filter ?? undefined,
        time: timeout,
      });
    } catch (result: unknown) {
      if (result instanceof Error && result.message.endsWith("reason: time")) {
        return null;
      }
      throw result;
    }
  }

  public static async sendInteractionResponse(
    interaction: CommandInteraction | MessageComponentInteraction,
    content: string,
    isPrivate = false,
    buttonMap?: Record<string, ButtonBuilder>,
  ): Promise<InteractionResponse> {
    return await interaction.reply({
      components: this.createComponentsValue(buttonMap),
      content,
      ephemeral: isPrivate,
    });
  }

  public static async sendMessage(
    channelId: string,
    content: string,
    buttonMap?: Record<string, ButtonBuilder>,
  ): Promise<Message> {
    const channel: TextChannel = this.getChannel(channelId);
    return await channel.send({
      components: this.createComponentsValue(buttonMap),
      content,
    });
  }

  public static async sendPersistentInteractionResponse(
    interaction: CommandInteraction | MessageComponentInteraction,
    content: string,
    isPrivate = false,
    buttonMap?: Record<string, ButtonBuilder>,
  ): Promise<InteractionResponse> {
    if (interaction instanceof MessageComponentInteraction) {
      return await this.updateInteractionSourceItem(
        interaction,
        content,
        buttonMap,
      );
    } else {
      return await this.sendInteractionResponse(
        interaction,
        content,
        isPrivate,
        buttonMap,
      );
    }
  }

  public static async updateInteractionSourceItem(
    interaction: MessageComponentInteraction,
    content: string,
    buttonMap?: Record<string, ButtonBuilder>,
  ): Promise<InteractionResponse> {
    return await interaction.update({
      components: this.createComponentsValue(buttonMap),
      content,
    });
  }

  public static async updateSentItem(
    sentItem: Message | InteractionResponse,
    content: string,
    buttonMap?: Record<string, ButtonBuilder>,
  ): Promise<void> {
    await sentItem.edit({
      components: this.createComponentsValue(buttonMap),
      content,
    });
  }
}
