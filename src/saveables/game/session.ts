import { Player } from ".";
import { DECK } from "../../constants";
import { Json, Log, Saveable, Utils } from "../../core";
import { DiscordUser } from "../../core/discord";
import { CardSuit, SessionStatus } from "../../enums";
import { Card, HandResult, PlayerJson, SessionJson } from "../../types";

export class Session implements Saveable {
  private __bloodDeck: Card[];

  private __bloodDiscard: Card[] = [];

  private __currentHandIndex: number = 0;

  private __currentPlayerIndex: number = 0;

  private __currentRoundIndex: number = 0;

  private __handResults: HandResult[][] = [];

  private __playerOrder: string[] = [];

  private __players: Record<string, Player> = {};

  private __sandDeck: Card[];

  private __sandDiscard: Card[] = [];

  private __startedAt: number | null = null;

  private __startingPlayerId: string;

  private __startingTokenTotal: number;

  private __status: SessionStatus = SessionStatus.PENDING;

  constructor(startingDiscordUser: DiscordUser, startingTokenTotal: number);

  constructor(json: Json);

  constructor(
    startingDiscordUserOrJson: DiscordUser | Json,
    startingTokenTotal?: number,
  ) {
    if (startingDiscordUserOrJson instanceof DiscordUser) {
      const discordUser: DiscordUser = startingDiscordUserOrJson;
      if (startingTokenTotal === undefined) {
        Log.throw(
          "Cannot construct session. Constructor was missing required arguments.",
          { startingTokenTotal },
        );
      }
      this.__bloodDeck = DECK(CardSuit.BLOOD);
      this.__sandDeck = DECK(CardSuit.SAND);
      this.__startingPlayerId = discordUser.id;
      this.__startingTokenTotal = startingTokenTotal;
      this.__createPlayer(discordUser);
    } else {
      const json: Json = startingDiscordUserOrJson;
      this.__bloodDeck = Utils.getJsonEntry(json, "bloodDeck") as Card[];
      this.__bloodDiscard = Utils.getJsonEntry(json, "bloodDiscard") as Card[];
      this.__currentHandIndex = Utils.getJsonEntry(
        json,
        "currentHandIndex",
      ) as number;
      this.__currentPlayerIndex = Utils.getJsonEntry(
        json,
        "currentPlayerIndex",
      ) as number;
      this.__currentRoundIndex = Utils.getJsonEntry(
        json,
        "currentRoundIndex",
      ) as number;
      this.__handResults = Utils.getJsonEntry(
        json,
        "handResults",
      ) as HandResult[][];
      this.__playerOrder = Utils.getJsonEntry(json, "playerOrder") as string[];
      this.__players = Object.fromEntries(
        Object.entries(
          Utils.getJsonEntry(json, "players") as Record<string, PlayerJson>,
        ).map(([playerId, playerJson]) => [playerId, new Player(playerJson)]),
      );
      this.__sandDeck = Utils.getJsonEntry(json, "sandDeck") as Card[];
      this.__sandDiscard = Utils.getJsonEntry(json, "sandDiscard") as Card[];
      this.__startedAt = Utils.getJsonEntry(json, "startedAt") as number | null;
      this.__startingPlayerId = Utils.getJsonEntry(
        json,
        "startingPlayerId",
      ) as string;
      this.__startingTokenTotal = Utils.getJsonEntry(
        json,
        "startingTokenTotal",
      ) as number;
      this.__status = Utils.getJsonEntry(json, "status") as SessionStatus;
    }
  }

  public get currentHandIndex(): number {
    return this.__currentHandIndex;
  }

  public get currentRoundIndex(): number {
    return this.__currentRoundIndex;
  }

  public get status(): SessionStatus {
    return this.__status;
  }

  private __createPlayer(discordUser: DiscordUser): Player {
    if (discordUser.id in this.__players) {
      Log.throw(
        "Cannot create player. A player already exists with the provided ID.",
        this,
        discordUser,
      );
    }
    this.__players[discordUser.id] = new Player(discordUser);
    return this.__players[discordUser.id];
  }

  public getPlayerById(playerId: string): Player | null {
    if (!(playerId in this.__players)) {
      return null;
    }
    return this.__players[playerId];
  }

  public toJson(): SessionJson {
    return {
      bloodDeck: this.__bloodDeck,
      bloodDiscard: this.__bloodDiscard,
      currentHandIndex: this.__currentHandIndex,
      currentPlayerIndex: this.__currentPlayerIndex,
      currentRoundIndex: this.__currentRoundIndex,
      handResults: this.__handResults,
      playerOrder: this.__playerOrder,
      players: Object.fromEntries(
        Object.entries(this.__players).map(([playerId, player]) => [
          playerId,
          player.toJson(),
        ]),
      ),
      sandDeck: this.__sandDeck,
      sandDiscard: this.__sandDiscard,
      startedAt: this.__startedAt,
      startingPlayerId: this.__startingPlayerId,
      startingTokenTotal: this.__startingTokenTotal,
      status: this.__status,
    };
  }
}
