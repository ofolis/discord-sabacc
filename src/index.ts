import {
  Command,
} from "./abstracts";
import {
  Environment,
} from "./environment";
import {
  Discord,
} from "./discord";
import {
  InfoCommand,
  NewCommand,
  PlayCommand,
} from "./handlers/commands";
import {
  Log,
} from "./log";

const commands: Command[] = [
  new InfoCommand(),
  new NewCommand(),
  new PlayCommand(),
];

function initializeApp(): void {
  Discord.client.once(
    "ready",
    () => {
      Log.info("Initializing Discord bot...");
      Discord.deployCommands(commands).then(
        () => {
          Log.info("Discord bot is ready.");
        },
        (reason: unknown) => {
          Log.error(
            "Failed to initialize Discord bot.",
            reason,
          );
        },
      );
    },
  );
  Discord.client.on(
    "guildCreate",
    (guild) => {
      Log.info(`Initializing guild ${guild.id}...`);
      Discord.deployCommands(
        commands,
        [
          guild.id,
        ],
      ).then(
        () => {
          Log.info(`Guild ${guild.id} is ready.`);
        },
        (reason: unknown) => {
          Log.error(
            `Failed to initialize guild ${guild.id}.`,
            reason,
          );
        },
      );
    },
  );
  Discord.client.on(
    "interactionCreate",
    (interaction) => {
      if (!interaction.isCommand()) {
        return;
      }
      const interactionLog: Record<string, unknown> = {
        "channelId": interaction.channelId,
        "command": interaction.commandName,
        "createdAt": interaction.createdAt.toUTCString(),
        "guild": interaction.guild ? {
          "id": interaction.guild.id,
          "name": interaction.guild.name,
        } : null,
        "id": interaction.id,
        "user": {
          "displayName": interaction.user.displayName,
          "globalName": interaction.user.globalName,
          "id": interaction.user.id,
          "username": interaction.user.username,
        },
      };
      Log.info(
        `New interaction ${interaction.id}.`,
        interactionLog,
      );
      try {
        const interactionCommand: Command | undefined = commands.find(command => command.name === interaction.commandName);
        if (interactionCommand === undefined) {
          Log.throw(
            `Unknown command "${interaction.commandName}".`,
            interaction,
          );
        }
        interactionCommand.execute(interaction).catch((reason: unknown) => {
          Log.throw(
            reason,
            interaction,
          );
        });
        Log.info(`Completed interaction ${interaction.id}.`);
      } catch (reason: unknown) {
        Log.error(
          `Failed to handle interaction ${interaction.id}.`,
          reason,
          interaction,
        );
      }
    },
  );
  Discord.client.login(Environment.config.discordBotToken).catch((reason: unknown) => {
    Log.error(
      "Failed to log in.",
      reason,
    );
  });
}

initializeApp();
