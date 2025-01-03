import {
  Card,
} from "./card";

export type HandResult = {
  "bloodCard": Card;
  "bloodCardValue": number;
  "cardDifference": number;
  "lowestCardValue": number;
  "playerIndex": number;
  "rankIndex": number;
  "sandCard": Card;
  "sandCardValue": number;
  "tokenLossTotal": number;
};
