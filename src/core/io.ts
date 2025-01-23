import * as fs from "fs";
import { Environment } from "./environment";
import { Log } from "./log";
import { Json } from "./types";

export class IO {
  private static __getDataFilePath(id: string): string {
    return `${Environment.dataPath}/${id}.json`;
  }

  public static loadData(id: string): Json | null {
    Log.debug("Loading data at ID...", { id });
    const filePath: string = this.__getDataFilePath(id);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const jsonString: string = fs.readFileSync(filePath, "utf8");
    const saveable: Json = JSON.parse(jsonString) as Json;
    Log.debug("Data loaded successfully.", { saveable });
    return saveable;
  }

  public static saveData(id: string, data: Json): void {
    Log.debug("Saving data at ID...", { id, data });
    if (!fs.existsSync(Environment.dataPath)) {
      fs.mkdirSync(Environment.dataPath);
    }
    const jsonString: string = JSON.stringify(data);
    fs.writeFileSync(this.__getDataFilePath(id), jsonString, {
      encoding: "utf8",
    });
    Log.debug("Data saved successfully.");
  }
}
