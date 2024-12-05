import {
  Command,
} from "../../enums/command";
import {
  type CommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

export class Play {
  public static get builder(): SlashCommandBuilder {
    const builder: SlashCommandBuilder = new SlashCommandBuilder()
      .setName(Command.PLAY)
      .setDescription("Play your turn.");
    return builder;
  }

  public static Execute = async(interaction: CommandInteraction): Promise<void> => {
    await interaction.reply("Play!");
  };
}
