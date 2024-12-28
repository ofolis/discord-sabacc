import {
  Environment,
} from "./environment";
import {
  Discord,
} from "./discord";
import {
  Info,
  New,
  Play,
} from "./handlers/commands";
import type {
  Command,
} from "./types";

const commands: Command[] = [
  Info,
  New,
  Play,
];

function initializeApp(): void {
  const commandMap: Record<string, Command> = commands.reduce<Record<string, Command>>(
    (map, command) => {
      map[command.name] = command;
      return map;
    },
    {},
  );
  Discord.client.once(
    "ready",
    () => {
      console.log("Initializing Discord bot...");
      Discord.deployCommands(commandMap).then(
        () => {
          console.log("Discord bot is ready.");
        },
        (reason: unknown) => {
          console.error("Failed to initialize Discord bot.");
          console.error(reason);
        },
      );
    },
  );
  Discord.client.on(
    "guildCreate",
    (guild) => {
      console.log(`Initializing guild ${guild.id}...`);
      Discord.deployCommands(
        commandMap,
        [
          guild.id,
        ],
      ).then(
        () => {
          console.log(`Guild ${guild.id} is ready.`);
        },
        (reason: unknown) => {
          console.error(`Failed to initialize guild ${guild.id}.`);
          console.error(reason);
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
      console.log(interactionLog);
      try {
        const interactionCommand: Command | undefined = commands.find(command => command.name === interaction.commandName);
        if (interactionCommand === undefined) {
          throw new ReferenceError(`Unknown command "${interaction.commandName}".`);
        }
        interactionCommand.execute(interaction).catch((reason: unknown) => {
          throw reason;
        });
        console.log(`Completed interaction ${interaction.id}.`);
      } catch (reason: unknown) {
        console.error(`Failed to handle interaction ${interaction.id}.`);
        console.error(reason);
      }
    },
  );
  Discord.client.login(Environment.config.discordBotToken).catch((reason: unknown) => {
    console.error("Failed to log in.");
    console.error(reason);
  });
}

initializeApp();
