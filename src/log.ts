export class Log {
  public static error(
    context: unknown,
    data1: unknown = "_NOT_SET_",
    data2: unknown = "_NOT_SET_",
    data3: unknown = "_NOT_SET_",
  ): void {
    if (data1 !== "_NOT_SET_") {
      console.error(data1);
    }
    if (data2 !== "_NOT_SET_") {
      console.error(data2);
    }
    if (data3 !== "_NOT_SET_") {
      console.error(data3);
    }
    console.error(context);
  }

  public static info(
    context: unknown,
    data1: unknown = "_NOT_SET_",
    data2: unknown = "_NOT_SET_",
    data3: unknown = "_NOT_SET_",
  ): void {
    if (data1 !== "_NOT_SET_") {
      console.log(data1);
    }
    if (data2 !== "_NOT_SET_") {
      console.log(data2);
    }
    if (data3 !== "_NOT_SET_") {
      console.log(data3);
    }
    console.log(context);
  }

  public static throw(
    context: unknown,
    data1: unknown = "_NOT_SET_",
    data2: unknown = "_NOT_SET_",
    data3: unknown = "_NOT_SET_",
  ): never {
    if (data1 !== "_NOT_SET_") {
      console.error(data1);
    }
    if (data2 !== "_NOT_SET_") {
      console.error(data2);
    }
    if (data3 !== "_NOT_SET_") {
      console.error(data3);
    }
    if (typeof context === "string") {
      throw new Error(context);
    } else {
      throw context;
    }
  }
}
