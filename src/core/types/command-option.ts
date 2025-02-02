import { CommandOptionType } from "..";

export type CommandOption =
  | {
      description: string;
      isRequired: boolean;
      name: string;
      type: CommandOptionType.BOOLEAN;
    }
  | {
      description: string;
      isRequired: boolean;
      maxValue: number;
      minValue: number;
      name: string;
      type: CommandOptionType.INTEGER | CommandOptionType.NUMBER;
    }
  | {
      description: string;
      isRequired: boolean;
      maxLength: number;
      minLength: number;
      name: string;
      type: CommandOptionType.STRING;
    };

export type CommandOptionTypeMap = {
  [CommandOptionType.BOOLEAN]: boolean;
  [CommandOptionType.INTEGER]: number;
  [CommandOptionType.NUMBER]: number;
  [CommandOptionType.STRING]: string;
};
