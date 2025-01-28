import { Client, REST, Routes, SlashCommandBuilder } from "discord.js";
import { Environment, Log } from ".";
import { Command } from "../core";

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
  private static __client: Client | null = null;

  public static get client(): Client {
    if (this.__client === null) {
      Log.debug("Creating Discord client...");
      this.__client = new Client({
        intents: ["DirectMessages", "Guilds", "GuildMessages"],
      });
      Log.debug("Discord client created successfully.", {
        client: this.__client,
      });
    }
    return this.__client;
  }

  private static async __deployGlobalCommands(
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
      .filter(value => value.command.isGlobal)
      .map(value => value.builder);
    Log.debug("Deploying global commands to Discord...", commandBuilders);
    await rest.put(
      Routes.applicationCommands(Environment.config.discordApplicationId),
      {
        body: commandBuilders,
      },
    );
    Log.debug("Discord global commands deployed successfully.");
  }

  private static async __deployGuildCommands(
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
      .filter(value => value.command.isGuild)
      .map(value => value.builder);
    Log.debug("Deploying commands to Discord guilds...", {
      commandBuilders,
      guildIds,
    });
    await Promise.all(
      guildIds.map(guildId =>
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
    Log.debug("Discord guild commands deployed successfully.");
  }

  public static async deployCommands(
    commandList: Command[],
    guildIds?: string[],
  ): Promise<void> {
    Log.debug("Deploying Discord commands...", { commandList, guildIds });
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
    commandList.forEach(command => {
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
    await this.__deployGlobalCommands(rest, commandMap);
    await this.__deployGuildCommands(rest, commandMap, guildIds);
    Log.debug("Discord commands deployed successfully.");
  }
}
