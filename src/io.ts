import * as fs from "fs";
import {
  Environment,
} from "./environment";
import {
  Saveable,
} from "./types";

export class IO {
  public static loadData(
    id: string,
  ): Saveable | null {
    const jsonFilePath: string = `${Environment.dataPath}/${id}.json`;
    if (!fs.existsSync(jsonFilePath)) {
      return null;
    }
    const jsonString: string = fs.readFileSync(
      jsonFilePath,
      "utf8",
    );
    const data: Saveable = JSON.parse(jsonString) as Saveable;
    return data;
  }

  public static saveData(
    id: string,
    data: Saveable,
  ): void {
    if (!fs.existsSync(Environment.dataPath)) {
      fs.mkdirSync(Environment.dataPath);
    }
    const jsonString: string = JSON.stringify(data);
    const jsonFilePath: string = `${Environment.dataPath}/${id}.json`;
    fs.writeFileSync(
      jsonFilePath,
      jsonString,
      {
        "encoding": "utf8",
      },
    );
  }
}
