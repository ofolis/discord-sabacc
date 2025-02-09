import { IO, Json } from "../core";
import { ChannelState } from "../entities";

export class DataController {
  public static loadChannelState(channelId: string): ChannelState | null {
    const channelStateJson: Json | null = IO.loadData(channelId);
    if (channelStateJson === null) {
      return null;
    }
    return new ChannelState(channelStateJson);
  }

  public static saveChannelState(channelState: ChannelState): void {
    IO.saveData(channelState.channelId, channelState.toJson());
  }
}
