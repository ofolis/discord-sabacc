import { REST, Routes } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";

const commandsData = Object.values(commands).map((command) => command.data);

const rest = new REST({
  version: "10",
}).setToken(config.DISCORD_BOT_TOKEN);

type DeployCommandsProps = {
  guildId: string;
};

export const deployCommands = async ({ guildId }: DeployCommandsProps) => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationGuildCommands(config.DISCORD_APPLICATION_ID, guildId),
      {
        body: commandsData,
      },
    );

    // await rest.put(
    //   Routes.applicationCommands(config.DISCORD_APPLICATION_ID),
    //   {
    //     body: [],
    //   },
    // );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
};
