import {
  Constants,
} from "../constants";
import type {
  CommandMap,
} from "../types";
import {
  Client,
  REST,
  Routes,
  type SlashCommandBuilder,
} from "discord.js";

export class Discord {
  private static _client: Client | null = null;

  public static async DeployCommands(commandMap: CommandMap, guildIds: string[] | undefined = undefined): Promise<void> {
    const rest: REST = new REST({
      "version": "10",
    }).setToken(Constants.environment.discordBotToken);
    if (guildIds === undefined) {
      guildIds = Array.from(this.client.guilds.cache.keys());
    }
    await this.DeployGlobalCommands(
      rest,
      commandMap,
    );
    await this.DeployGuildCommands(
      rest,
      commandMap,
      guildIds,
    );
  }

  private static async DeployGlobalCommands(rest: REST, commandMap: CommandMap): Promise<void> {
    console.log("Deploying global commands...");
    const commandBuilders: SlashCommandBuilder[] = [
    ];
    for (const value of Object.values(commandMap)) {
      if (value.isGlobalCommand) {
        commandBuilders.push(value.builder);
      }
    }
    await rest.put(
      Routes.applicationCommands(Constants.environment.discordApplicationId),
      {
        "body": commandBuilders,
      },
    );
    console.log("Successfully deployed global commands.");
  }

  private static async DeployGuildCommands(rest: REST, commandMap: CommandMap, guildIds: string[]): Promise<void> {
    console.log("Deploying guild commands...");
    const commandBuilders: SlashCommandBuilder[] = [
    ];
    for (const value of Object.values(commandMap)) {
      if (value.isGuildCommand) {
        commandBuilders.push(value.builder);
      }
    }
    const promises: Array<Promise<unknown>> = guildIds.map(async(guildId: string) => await rest.put(
      Routes.applicationGuildCommands(
        Constants.environment.discordApplicationId,
        guildId,
      ),
      {
        "body": commandBuilders,
      },
    ));
    await Promise.all(promises);
    console.log("Successfully deployed guild commands.");
  }

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
}
