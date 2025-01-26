import { ChannelState } from "../saveables";
import { DataController } from "./data-controller";

export class GameController {
  public static startGame(channelState: ChannelState): void {
    DataController.saveChannelState(channelState);
  }
}
