import { loadDriver } from "./loadDriver.js";

test.each(["mysql2", "pg"] as const)(
  "explains how to install missing %s",
  async (name) => {
    const error = Object.assign(
      new Error(`Cannot find package '${name}' imported from sasat`),
      { code: "ERR_MODULE_NOT_FOUND" },
    );
    await expect(
      loadDriver(name, async () => {
        throw error;
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining(`yarn add ${name}`),
      cause: error,
    });
  },
);

test("preserves a failure in a driver's own dependency", async () => {
  const error = Object.assign(new Error("Cannot find module 'pg-protocol'"), {
    code: "MODULE_NOT_FOUND",
  });
  await expect(
    loadDriver("pg", async () => {
      throw error;
    }),
  ).rejects.toBe(error);
});

test.each([
  ["mysql2", "mysql2/promise"],
  ["pg", "pg"],
] as const)("resolves only the selected %s driver", async (name, specifier) => {
  const driver = {} as never;
  const load = jest.fn().mockResolvedValue(driver);
  await expect(loadDriver(name, load)).resolves.toBe(driver);
  expect(load).toHaveBeenCalledTimes(1);
  expect(load).toHaveBeenCalledWith(specifier);
});
