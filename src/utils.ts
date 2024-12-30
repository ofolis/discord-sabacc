export class Utils {
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
      throw new Error("Cannot remove item from empty array.");
    }
    return topItem;
  }
}
