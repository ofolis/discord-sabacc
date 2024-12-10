import * as fs from "fs";
import {
  Constants,
} from "./constants";
import {
  Saveable,
} from "./types";

export class Utils {
  public static loadData<DataType extends Saveable>(guildId: string, channelId: string): DataType | null {
    if (guildId.length === 0 || channelId.length === 0) {
      throw new Error("Guild and channel IDs cannot be blank.");
    }
    const jsonFilePath: string = `${Constants.dataPath}/${guildId}${channelId}.json`;
    if (!fs.existsSync(jsonFilePath)) {
      return null;
    }
    const jsonString: string = fs.readFileSync(
      jsonFilePath,
      "utf8",
    );
    const data: DataType = JSON.parse(jsonString) as DataType;
    return data;
  }

  public static saveData(guildId: string, channelId: string, data: Saveable): void {
    if (guildId.length === 0 || channelId.length === 0) {
      throw new Error("Guild and channel IDs cannot be blank.");
    }
    if (!fs.existsSync(Constants.dataPath)) {
      fs.mkdirSync(Constants.dataPath);
    }
    const jsonString: string = JSON.stringify(data);
    const jsonFilePath: string = `${Constants.dataPath}/${guildId}${channelId}.json`;
    fs.writeFileSync(
      jsonFilePath,
      jsonString,
      {
        "encoding": "utf8",
      },
    );
  }

  public static shuffleArray<ItemType>(array: ItemType[]): ItemType[] {
    const arrayCopy: ItemType[] = Array.from(array);
    let currentIndex: number = arrayCopy.length;
    while (currentIndex !== 0) {
      const randomIndex: number = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [
        arrayCopy[currentIndex],
        arrayCopy[randomIndex],
      ] = [
        arrayCopy[randomIndex],
        arrayCopy[currentIndex],
      ];
    }
    return arrayCopy;
  }
}
