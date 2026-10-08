import { getDbClient } from "../../db/getDbClient.js";
import { Console } from "../console.js";
import { generateTestMigFileCommand } from "./generateTestMigFileCommand.js";
import { generateTestMigrationFile } from "./generateTestMigrationFile.js";

jest.mock("../../db/getDbClient.js", () => ({ getDbClient: jest.fn() }));
jest.mock("./generateTestMigrationFile.js", () => ({
  generateTestMigrationFile: jest.fn(),
}));

test.each([true, false])(
  "generates and releases the client with silent=%s",
  async (silent) => {
    const client = { release: jest.fn().mockResolvedValue(undefined) };
    jest.mocked(getDbClient).mockReturnValue(client as never);
    jest.mocked(generateTestMigrationFile).mockResolvedValue(undefined);
    jest.spyOn(Console, "success").mockImplementation(() => {});
    await generateTestMigFileCommand({ silent });
    expect(generateTestMigrationFile).toHaveBeenCalledWith(client);
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(Console.success).toHaveBeenCalledTimes(silent ? 0 : 1);
  },
);

test("propagates failures and releases the client without exiting the process", async () => {
  const client = { release: jest.fn().mockResolvedValue(undefined) };
  jest.mocked(getDbClient).mockReturnValue(client as never);
  jest
    .mocked(generateTestMigrationFile)
    .mockRejectedValueOnce(new Error("generation failed"));
  await expect(generateTestMigFileCommand({ silent: true })).rejects.toThrow(
    "generation failed",
  );
  expect(client.release).toHaveBeenCalledTimes(1);
});
