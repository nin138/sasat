type Drivers = {
  mysql2: typeof import("mysql2/promise");
  pg: typeof import("pg");
};

/** Report an absent optional driver without hiding failures in its own dependencies. */
export async function loadDriver<Name extends keyof Drivers>(
  name: Name,
  // Leave optional drivers to Node at runtime, including in application bundles.
  // Literal import("pg") / import("mysql2/promise") makes bundlers resolve both.
  load: (specifier: string) => Promise<Drivers[Name]> = (specifier) =>
    import(/* webpackIgnore: true */ /* @vite-ignore */ specifier),
): Promise<Drivers[Name]> {
  try {
    return await load(name === "mysql2" ? "mysql2/promise" : name);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error.code === "MODULE_NOT_FOUND" ||
        error.code === "ERR_MODULE_NOT_FOUND") &&
      (error.message.includes(`'${name}'`) ||
        error.message.includes(`'${name}/promise'`))
    ) {
      throw new Error(
        `The ${name} database driver is not installed. Install it in your application with: yarn add ${name}`,
        { cause: error },
      );
    }
    throw error;
  }
}
