/** Report an absent optional driver without hiding failures in its own dependencies. */
export async function loadDriver<T>(
  name: "mysql2" | "pg",
  load: () => Promise<T>,
): Promise<T> {
  try {
    return await load();
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
