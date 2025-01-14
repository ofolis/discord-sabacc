import dotenv from "dotenv";
import { Log } from "./log";
import type { Config } from "./types";
import * as packageJson from "../package.json";

export class Environment {
  private static _config: Config | null = null;

  private static getEnvVariable(key: string, required: boolean): string {
    const value: string | undefined = process.env[key];
    if (value === undefined) {
      if (!required) {
        return "";
      }
      Log.throw(
        "Cannot get environment variable. Requested key was not defined.",
        {
          env: process.env,
          key,
        },
      );
    }
    return value;
  }

  public static get config(): Config {
    if (this._config === null) {
      dotenv.config();
      this._config = {
        devMode:
          this.getEnvVariable("DEV_MODE", false).toUpperCase() === "TRUE",
        discordApplicationId: this.getEnvVariable(
          "DISCORD_APPLICATION_ID",
          true,
        ),
        discordBotToken: this.getEnvVariable("DISCORD_BOT_TOKEN", true),
      };
    }
    return this._config;
  }

  public static get dataPath(): string {
    return `${process.cwd()}/data`;
  }

  public static get packageName(): string {
    if ("name" in packageJson) {
      return packageJson.name;
    }
    Log.throw(
      "Cannot get package name. Package name is not defined in package.json.",
    );
  }

  public static get packageVersion(): string | null {
    if ("version" in packageJson) {
      return packageJson.version as string;
    }
    return null;
  }
}
