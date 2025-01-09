import dotenv from "dotenv";
import { Log } from "./log";
import type { Config } from "./types";

export class Environment {
  private static _config: Config | null = null;

  private static getEnvVariable(key: string): string {
    this.loadEnv();
    const value: string | undefined = process.env[key];
    if (value === undefined) {
      Log.throw(
        "Cannot get environment variable. Requested key was not defined.",
        key,
        process.env,
      );
    }
    return value;
  }

  private static loadEnv(): void {
    if (this._config === null) {
      dotenv.config();
    }
  }

  public static get config(): Config {
    if (this._config === null) {
      this._config = {
        discordApplicationId: this.getEnvVariable("DISCORD_APPLICATION_ID"),
        discordBotToken: this.getEnvVariable("DISCORD_BOT_TOKEN"),
      };
    }
    return this._config;
  }

  public static get dataPath(): string {
    return `${process.cwd()}/data`;
  }
}
