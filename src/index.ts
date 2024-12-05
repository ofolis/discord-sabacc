import {
  Constants,
} from "./constants";
import {
  Command,
} from "./enums";
import {
  Discord,
} from "./handlers";
import {
  Info,
  New,
  Play,
} from "./handlers/commands";
import type {
  CommandMap,
} from "./types";

const commandMap: CommandMap = {
  [Command.INFO]: {
    "builder": Info.builder,
    "executeFunction": Info.Execute,
    "isGlobalCommand": false,
    "isGuildCommand": true,
  },
  [Command.NEW]: {
    "builder": New.builder,
    "executeFunction": New.Execute,
    "isGlobalCommand": false,
    "isGuildCommand": true,
  },
  [Command.PLAY]: {
    "builder": Play.builder,
    "executeFunction": Play.Execute,
    "isGlobalCommand": false,
    "isGuildCommand": true,
  },
};

function initializeApp(): void {
  Discord.client.once(
    "ready",
    () => {
      console.log("Initializing Discord bot...");
      Discord.DeployCommands(commandMap).then(
        () => {
          console.log("Discord bot is ready! 🤖");
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
      Discord.DeployCommands(
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
      console.log(interaction);
      try {
        let parsedCommand: Command | undefined = undefined;
        for (const value of Object.values(Command)) {
          if ((value as string) === interaction.commandName) {
            parsedCommand = value;
            break;
          }
        }
        if (parsedCommand === undefined) {
          throw new ReferenceError(`Unknown command "${interaction.commandName}".`);
        }
        if (parsedCommand in commandMap) {
          commandMap[parsedCommand].executeFunction(interaction).catch((reason: unknown) => {
            if (reason instanceof Error) {
              throw reason;
            } else {
              throw new Error(String(reason));
            }
          });
        } else {
          throw new ReferenceError(`Command "${interaction.commandName}" has no execution path.`);
        }
      } catch (e) {
        console.error(`Failed to handle "${interaction.commandName}".`);
        console.error(e);
      }
    },
  );
  Discord.client.login(Constants.environment.discordBotToken).catch((reason: unknown) => {
    console.error(`Failed to log in.`);
    console.error(reason);
  });
}

initializeApp();
