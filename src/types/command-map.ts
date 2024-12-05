import type {
  Command,
} from "../enums";
import type {
  CommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

export type CommandMap = Record<Command, CommandMapValue>;

export type CommandMapValue = {
  "builder": SlashCommandBuilder;
  "executeFunction": (interaction: CommandInteraction) => Promise<void>;
  "isGlobalCommand": boolean;
  "isGuildCommand": boolean;
};
