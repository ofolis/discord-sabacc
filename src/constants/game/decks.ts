import {
  CardSuit,
  CardType,
} from "../../enums";
import {
  Card,
} from "../../types";

const bloodDeck: Card[] = [
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.SYLOP,
    "value": 0,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.IMPOSTER,
    "value": 0,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.IMPOSTER,
    "value": 0,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.IMPOSTER,
    "value": 0,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 1,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 1,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 1,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 2,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 2,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 2,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 3,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 3,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 3,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 4,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 4,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 4,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 5,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 5,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 5,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 6,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 6,
  },
  {
    "suit": CardSuit.BLOOD,
    "type": CardType.NUMBER,
    "value": 6,
  },
];

const sandDeck: Card[] = [
  {
    "suit": CardSuit.SAND,
    "type": CardType.SYLOP,
    "value": 0,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.IMPOSTER,
    "value": 0,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.IMPOSTER,
    "value": 0,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.IMPOSTER,
    "value": 0,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 1,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 1,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 1,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 2,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 2,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 2,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 3,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 3,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 3,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 4,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 4,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 4,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 5,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 5,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 5,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 6,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 6,
  },
  {
    "suit": CardSuit.SAND,
    "type": CardType.NUMBER,
    "value": 6,
  },
];

export function createBloodDeck(): Card[] {
  return [
    ...bloodDeck,
  ]; // Return a fresh copy of the blood deck
};

export function createSandDeck(): Card[] {
  return [
    ...sandDeck,
  ]; // Return a fresh copy of the sand deck
};
