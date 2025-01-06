import {
  PlayerCard,
} from ".";

export type HandResult = {
  "bloodCard": PlayerCard;
  "bloodCardValue": number;
  "cardDifference": number;
  "lowestCardValue": number;
  "playerIndex": number;
  "rankIndex": number;
  "sandCard": PlayerCard;
  "sandCardValue": number;
  "tokenLossTotal": number;
  "tokenPenaltyTotal": number;
  "spentTokenTotal": number;
};
