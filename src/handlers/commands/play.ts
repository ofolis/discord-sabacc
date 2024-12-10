import type {
  DiscordCommandInteraction,
} from "../../discord";
import type {
  Command,
} from "../../types";

export const command: Command = {
  "description": "Play your turn.",
  "execute": async(interaction: DiscordCommandInteraction): Promise<void> => {
    await interaction.reply("Play!");
  },
  "isGlobal": false,
  "isGuild": true,
  "name": "play",
};
