import {
  Command,
} from "../../enums/command";
import {
  type CommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

export class New {
  public static get builder(): SlashCommandBuilder {
    const builder: SlashCommandBuilder = new SlashCommandBuilder()
      .setName(Command.NEW)
      .setDescription("Start a new game.");
    return builder;
  }

  public static Execute = async(interaction: CommandInteraction): Promise<void> => {
    await interaction.reply("New!");
  };
}
