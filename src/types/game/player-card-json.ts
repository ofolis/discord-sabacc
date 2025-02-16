import { Card } from ".";
import { PlayerCardSource } from "../../enums";

export type PlayerCardJson = {
  card: Card;
  dieRolls: number[];
  source: PlayerCardSource;
};
