import { PlayerCard, Turn } from ".";
import { Json, Saveable, Utils } from "../../core";
import { DiscordUser } from "../../core/discord";
import { PlayerStatus } from "../../enums";
import { HandResult, PlayerCardJson, PlayerJson, TurnJson } from "../../types";
export class Player implements Saveable {
  private __currentSpentTokenTotal: number = 0;

  private __currentTokenTotal: number = 0;

  private __currentTurn: Turn | null = null;

  private __avatarId: string | null;

  private __currentPlayerCards: PlayerCard[] = [];

  private __globalName: string | null;

  private __handResults: HandResult[] = [];

  private __status: PlayerStatus = PlayerStatus.UNINITIALIZED;

  private __username: string;

  public readonly id: string;

  constructor(discordUserOrJson: DiscordUser | Json) {
    if (discordUserOrJson instanceof DiscordUser) {
      const discordUser: DiscordUser = discordUserOrJson;
      this.__avatarId = discordUser.avatar;
      this.__globalName = discordUser.globalName;
      this.__username = discordUser.username;
      this.id = discordUser.id;
    } else {
      const json: Json = discordUserOrJson;
      this.__avatarId = Utils.getJsonEntry(json, "avatarId") as string;
      this.__currentPlayerCards = (
        Utils.getJsonEntry(json, "currentCards") as PlayerCardJson[]
      ).map(playerCardJson => new PlayerCard(playerCardJson));
      this.__currentSpentTokenTotal = Utils.getJsonEntry(
        json,
        "currentSpentTokenTotal",
      ) as number;
      this.__currentTokenTotal = Utils.getJsonEntry(
        json,
        "currentTokenTotal",
      ) as number;
      const currentTurnJson: TurnJson | null = Utils.getJsonEntry(
        json,
        "currentTurn",
      ) as TurnJson | null;
      this.__currentTurn =
        currentTurnJson !== null ? new Turn(currentTurnJson) : null;
      this.__globalName = Utils.getJsonEntry(json, "globalName") as string;
      this.__handResults = Utils.getJsonEntry(
        json,
        "handResults",
      ) as HandResult[];
      this.__status = Utils.getJsonEntry(json, "status") as PlayerStatus;
      this.__username = Utils.getJsonEntry(json, "username") as string;
      this.id = Utils.getJsonEntry(json, "id") as string;
    }
  }

  public toJson(): PlayerJson {
    return {
      avatarId: this.__avatarId,
      currentPlayerCards: this.__currentPlayerCards.map(playerCard =>
        playerCard.toJson(),
      ),
      currentSpentTokenTotal: this.__currentSpentTokenTotal,
      currentTokenTotal: this.__currentTokenTotal,
      currentTurn:
        this.__currentTurn !== null ? this.__currentTurn.toJson() : null,
      id: this.id,
      globalName: this.__globalName,
      handResults: this.__handResults,
      status: this.__status,
      username: this.__username,
    };
  }
}
