import type {
  DiscordCommandInteraction,
} from "../../discord";
import type {
  Command,
} from "../../types";

export const command: Command = {
  "description": "Get the current game info.",
  "execute": async(interaction: DiscordCommandInteraction): Promise<void> => {
    await interaction.reply("Info!");
  },
  "isGlobal": false,
  "isGuild": true,
  "name": "info",
};
