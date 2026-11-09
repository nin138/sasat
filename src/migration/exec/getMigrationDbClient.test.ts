import { existsSync } from "node:fs";
import { getDbClient } from "../../db/getDbClient.js";
import { getMigrationDbClient } from "./getMigrationDbClient.js";

jest.mock("node:fs", () => ({
  ...jest.requireActual("node:fs"),
  existsSync: jest.fn(),
}));
jest.mock("../../db/getDbClient.js", () => ({ getDbClient: jest.fn() }));

test("uses the default client before the application client has been generated", async () => {
  jest.mocked(existsSync).mockReturnValue(false);
  const client = { release: jest.fn() };
  jest.mocked(getDbClient).mockReturnValue(client as never);
  await expect(getMigrationDbClient()).resolves.toBe(client);
  expect(getDbClient).toHaveBeenCalledTimes(1);
  expect(client.release).not.toHaveBeenCalled();
});
