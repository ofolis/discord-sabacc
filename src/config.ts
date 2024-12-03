import dotenv from "dotenv";

dotenv.config();

if (
  process.env.DISCORD_APPLICATION_ID === undefined ||
  process.env.DISCORD_BOT_TOKEN === undefined
) {
  throw new Error("Missing required environment variables");
}

export const config = {
  DEV_GUILD_ID: process.env.DEV_GUILD_ID,
  DISCORD_APPLICATION_ID: process.env.DISCORD_APPLICATION_ID,
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
};
