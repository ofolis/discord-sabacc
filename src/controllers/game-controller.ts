import { ChannelState } from "../saveables";
import { DataController } from "./data-controller";

export class GameController {
  public static startGame(channelState: ChannelState): void {
    channelState.session.startGame();
    channelState.session.resetDecks();
    channelState.session.dealCardsToPlayers();
    DataController.saveChannelState(channelState);
  }
}
