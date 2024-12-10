import {
  Discord,
  type DiscordCommandInteraction,
} from "../../discord";
import {
  SessionStatus,
} from "../../enums";
import type {
  Command,
  Session,
} from "../../types";
import {
  Game,
} from "../game";

export const command: Command = {
  "description": "Start a new game.",
  "execute": async(interaction: DiscordCommandInteraction): Promise<void> => {
    if (interaction.guildId === null) {
      return;
    }
    const session: Session = Game.getSession(
      interaction.guildId,
      interaction.channelId,
    );
    let createNewSession: boolean = true;
    if (session.status !== SessionStatus.COMPLETED) {
      createNewSession = await Discord.confirm(
        interaction,
        "A game is currently active in this channel. Do you want to end it and start a new game?",
        "End Game",
        "Cancel",
        true,
      );
    }
    if (createNewSession) {
      Game.createNewSession(
        interaction.guildId,
        interaction.channelId,
        {
          ...interaction.user,
          "totalPlayedTokens": 0,
          "totalUnplayedTokens": 0,
        },
      );
    }
  },
  "isGlobal": false,
  "isGuild": true,
  "name": "new",
};
