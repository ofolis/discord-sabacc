import type {
  DiscordCommandInteraction,
} from "../../discord";
import type {
  Command,
} from "../../types";
import {
  Game,
} from "../game";

export const command: Command = {
  "description": "Play your turn.",
  "execute": async(interaction: DiscordCommandInteraction): Promise<void> => {
    await interaction.reply("Play!");
    if (interaction.guildId === null) {
      throw new Error("Guild ID is null.");
    }
    Game.play(
      interaction.guildId,
      interaction.channelId,
    );
  },
  "isGlobal": false,
  "isGuild": true,
  "name": "play",
};
