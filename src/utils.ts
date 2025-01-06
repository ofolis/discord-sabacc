import {
  Log,
} from "./log";

export class Utils {
  public static emptyArray(
    array: unknown[],
  ): void {
    array.length = 0;
  }

  public static emptyObject(
    object: Record<string, unknown>,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    Object.keys(object).forEach(key => delete object[key]);
  }

  public static linesToString(
    lines: string[],
  ): string {
    return lines.join("\n");
  }

  public static removeTopArrayItem<T>(
    array: T[],
  ): T {
    const topItem: T | undefined = array.shift();
    if (topItem === undefined) {
      Log.throw("Cannot remove item from empty array.");
    }
    return topItem;
  }
}
