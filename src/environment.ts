import dotenv from "dotenv";
import {
  Log,
} from "./log";
import type {
  Config,
} from "./types";

export class Environment {
  private static _config: Config | null = null;

  private static envLoaded = false;

  private static getEnvVariable(
    key: string,
  ): string {
    if (!this.envLoaded) {
      dotenv.config();
      this.envLoaded = true;
    }
    if (typeof process.env[key] !== "string") {
      Log.throw(
        "Cannot get environment variable. Requested key was not defined.",
        key,
        process.env,
      );
    }
    return process.env[key];
  }

  public static get config(): Config {
    if (this._config === null) {
      this._config = {
        "discordApplicationId": this.getEnvVariable("DISCORD_APPLICATION_ID"),
        "discordBotToken": this.getEnvVariable("DISCORD_BOT_TOKEN"),
      };
    }
    return this._config;
  }

  public static get dataPath(): string {
    const currentDirectoryPath: string = process.cwd();
    const dataDirectoryName: string = "data";
    return `${currentDirectoryPath}/${dataDirectoryName}`;
  }
}
