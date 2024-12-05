import type {
  DiscordCommandInteraction,
} from "../../discord";
import type {
  Command,
} from "../../types";

export const command: Command = {
  "description": "Start a new game.",
  "execute": async(interaction: DiscordCommandInteraction): Promise<void> => {
    await interaction.reply("New!");
  },
  "isGlobal": false,
  "isGuild": true,
  "name": "new",
};
