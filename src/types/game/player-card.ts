import { PlayerCardSource } from "../../enums";
import { Card } from ".";

export type PlayerCard = {
  card: Card;
  dieRollValues: number[];
  source: PlayerCardSource;
};
