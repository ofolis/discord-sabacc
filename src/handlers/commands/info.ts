import {
  Command,
} from "../../enums/command";
import {
  type CommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

export class Info {
  public static get builder(): SlashCommandBuilder {
    const builder: SlashCommandBuilder = new SlashCommandBuilder()
      .setName(Command.INFO)
      .setDescription("Get the current game info.");
    return builder;
  }

  public static Execute = async(interaction: CommandInteraction): Promise<void> => {
    await interaction.reply("Info!");
  };
}
