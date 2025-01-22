import { Card } from ".";
import { PlayerCardSource } from "../../enums";

export type PlayerCardJson = {
  card: Card;
  dieRollValues: number[];
  source: PlayerCardSource;
};
