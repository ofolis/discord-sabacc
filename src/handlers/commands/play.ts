import type {
  DiscordCommandInteraction,
} from "../../discord";
import type {
  Command,
} from "../../types";

export const command: Command = {
  "name": "play",
  "description": "Play your turn.",
  "isGlobal": false,
  "isGuild": true,
  "execute": async(interaction: DiscordCommandInteraction): Promise<void> => {
    await interaction.reply("Play!");
  },
};
