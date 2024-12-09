import {
  Session,
} from "../../types";
import {
  Utils,
} from "../../utils";

export class Game {
  public static play(guildId: string, channelId: string): void {
    const session: Session = {
      "channelId": channelId,
      "guildId": guildId,
      "players": [
      ],
    };
    Utils.saveData(
      `${guildId}${channelId}`,
      session,
    );
  }
}
