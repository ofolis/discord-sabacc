import * as fs from "fs";
import {
  Environment,
} from "./environment";
import {
  Saveable,
} from "./types";

export class IO {
  private static getFilePath(id: string): string {
    return `${Environment.dataPath}/${id}.json`;
  }

  public static loadData(id: string): Saveable | null {
    const filePath: string = this.getFilePath(id);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const jsonString: string = fs.readFileSync(
      filePath,
      "utf8",
    );
    return JSON.parse(jsonString) as Saveable;
  }

  public static saveData(id: string, data: Saveable): void {
    if (!fs.existsSync(Environment.dataPath)) {
      fs.mkdirSync(Environment.dataPath);
    }
    const jsonString: string = JSON.stringify(data);
    fs.writeFileSync(
      this.getFilePath(id),
      jsonString,
      {
        "encoding": "utf8",
      },
    );
  }
}
