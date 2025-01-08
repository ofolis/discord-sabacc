export class Log {
  private static formatPrefix(): string {
    const milliseconds: number = Date.now();
    const prefix: string = `[${milliseconds.toString()}]`;
    return prefix;
  }

  public static error(
    context: unknown,
    data1: unknown = "_NOT_SET_",
    data2: unknown = "_NOT_SET_",
    data3: unknown = "_NOT_SET_",
  ): void {
    console.error(
      `\x1b[2m${this.formatPrefix()}\x1b[0m \x1b[31m%s\x1b[0m`,
      context,
    );
    if (data1 !== "_NOT_SET_") {
      console.error(data1);
    }
    if (data2 !== "_NOT_SET_") {
      console.error(data2);
    }
    if (data3 !== "_NOT_SET_") {
      console.error(data3);
    }
  }

  public static info(
    context: unknown,
    data1: unknown = "_NOT_SET_",
    data2: unknown = "_NOT_SET_",
    data3: unknown = "_NOT_SET_",
  ): void {
    console.log(
      `\x1b[2m${this.formatPrefix()}\x1b[0m %s`,
      context,
    );
    if (data1 !== "_NOT_SET_") {
      console.log(data1);
    }
    if (data2 !== "_NOT_SET_") {
      console.log(data2);
    }
    if (data3 !== "_NOT_SET_") {
      console.log(data3);
    }
  }

  public static success(
    context: unknown,
    data1: unknown = "_NOT_SET_",
    data2: unknown = "_NOT_SET_",
    data3: unknown = "_NOT_SET_",
  ): void {
    console.log(
      `\x1b[2m${this.formatPrefix()}\x1b[0m \x1b[32m%s\x1b[0m`,
      context,
    );
    if (data1 !== "_NOT_SET_") {
      console.log(data1);
    }
    if (data2 !== "_NOT_SET_") {
      console.log(data2);
    }
    if (data3 !== "_NOT_SET_") {
      console.log(data3);
    }
  }

  public static throw(
    context: unknown,
    data1: unknown = "_NOT_SET_",
    data2: unknown = "_NOT_SET_",
    data3: unknown = "_NOT_SET_",
  ): never {
    if (data3 !== "_NOT_SET_") {
      console.error(data3);
    }
    if (data2 !== "_NOT_SET_") {
      console.error(data2);
    }
    if (data1 !== "_NOT_SET_") {
      console.error(data1);
    }
    if (typeof context === "string") {
      throw new Error(context);
    } else {
      throw context;
    }
  }
}
