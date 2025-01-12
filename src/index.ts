import { Command } from "./abstracts";
import { Environment } from "./environment";
import { Discord } from "./discord";
import { InfoCommand, NewCommand, PlayCommand } from "./handlers/commands";
import { Log } from "./log";

const commands: Command[] = [
  new InfoCommand(),
  new NewCommand(),
  new PlayCommand(),
];

function initializeApp(): void {
  Log.info("Discord bot is initializing...");
  Discord.client.once("ready", () => {
    Discord.deployCommands(commands).then(
      () => {
        Log.success("Discord bot is ready.");
      },
      (reason: unknown) => {
        Log.error("Failed to initialize Discord bot.", reason);
      },
    );
  });
  Discord.client.on("guildCreate", (guild) => {
    Discord.deployCommands(commands, [guild.id]).then(
      () => {
        Log.success("Discord bot deployed to new guild.", guild);
      },
      (reason: unknown) => {
        Log.error("Failed to deploy Discord bot on new guild.", reason, guild);
      },
    );
  });
  Discord.client.on("interactionCreate", (interaction) => {
    if (!interaction.isCommand()) {
      return;
    }
    const interactionInfo: Record<string, unknown> = {
      channelId: interaction.channelId,
      command: interaction.commandName,
      createdAt: interaction.createdAt.toUTCString(),
      guild:
        interaction.guild !== null
          ? {
              id: interaction.guild.id,
              name: interaction.guild.name,
            }
          : null,
      id: interaction.id,
      user: {
        displayName: interaction.user.displayName,
        globalName: interaction.user.globalName,
        id: interaction.user.id,
        username: interaction.user.username,
      },
    };
    Log.info(`New interaction ${interaction.id}.`, interactionInfo);
    try {
      const interactionCommand: Command | undefined = commands.find(
        (command) => command.name === interaction.commandName,
      );
      if (interactionCommand === undefined) {
        Log.throw(
          "Cannot handle interaction. Unknown command was provided.",
          interaction,
        );
      }
      interactionCommand.execute(interaction).then(
        () => {
          Log.success(`Completed interaction ${interaction.id}.`);
        },
        (reason: unknown) => {
          Log.throw(reason, interaction);
        },
      );
    } catch (reason: unknown) {
      Log.error(
        `Failed to handle interaction ${interaction.id}.`,
        reason,
        interaction,
      );
    }
  });
  Discord.client
    .login(Environment.config.discordBotToken)
    .catch((reason: unknown) => {
      Log.error("Failed to log into Discord.", reason);
    });
}

initializeApp();