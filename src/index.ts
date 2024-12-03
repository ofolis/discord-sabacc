import { Client } from 'discord.js';
import { config } from './config';
import { commands } from './commands';
import { deployCommands } from './deploy-commands';

export const client = new Client({
  intents: [
    'Guilds',
    'GuildMessages',
    'DirectMessages',
  ],
});

client.once(
  'ready',
  () => {
    if (config.DEV_GUILD_ID !== undefined) {
      (async () => {
        if (typeof config.DEV_GUILD_ID === 'string') {
          console.log('Deploying commands to dev guild.');
          await deployCommands({
            guildId: config.DEV_GUILD_ID,
          });
        }
        console.log('Discord bot is ready! 🤖');
      })().catch((e) => {
        console.error(e);
      });
    }
  },
);

client.on(
  'guildCreate',
  (guild) => {
    (async () => {
      await deployCommands({
        guildId: guild.id,
      });
    })().catch((e) => {
      console.error(e);
    });
  },
);

client.on(
  'interactionCreate',
  (interaction) => {
    if (!interaction.isCommand()) {
      return;
    }
    const { commandName } = interaction;
    if (commands[commandName as keyof typeof commands]) {
      commands[commandName as keyof typeof commands]
        .execute(interaction)
        .catch((e) => {
          console.error(e);
        });
    }
  },
);

client.login(config.DISCORD_BOT_TOKEN).catch((e) => {
  console.error(e);
});
