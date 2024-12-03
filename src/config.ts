import dotenv from 'dotenv';

dotenv.config();

const { DEV_GUILD_ID, DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN } = process.env;

if (DISCORD_APPLICATION_ID === undefined || DISCORD_BOT_TOKEN === undefined) {
  throw new Error('Missing required environment variables');
}

export const config = {
  DEV_GUILD_ID,
  DISCORD_APPLICATION_ID,
  DISCORD_BOT_TOKEN,
};
