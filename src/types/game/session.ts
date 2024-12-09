import {
  Player,
} from "./player";

export type Session = {
  "channelId": string;
  "guildId": string;
  "players": Player[];
};
