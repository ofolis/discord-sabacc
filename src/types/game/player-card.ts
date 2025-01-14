import { Card } from ".";
import { PlayerCardSource } from "../../enums";

export type PlayerCard = {
  card: Card;
  dieRollValues: number[];
  source: PlayerCardSource;
};
