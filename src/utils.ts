export class Utils {
  public static removeTopArrayItem<T>(array: T[]): T {
    const topItem: T | undefined = array.shift();
    if (topItem === undefined) {
      throw new Error("Cannot remove item from empty array.");
    }
    return topItem;
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
