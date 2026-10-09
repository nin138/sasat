import { getDbClient } from "../../db/getDbClient.js";
import { SqlGenerator } from "../../db/sqlGenerator.js";
import { Console } from "../console.js";
import { generateTestMigFileCommand } from "./generateTestMigFileCommand.js";
import { generateTestMigrationFile } from "./generateTestMigrationFile.js";

jest.mock("../../db/getDbClient.js", () => ({ getDbClient: jest.fn() }));
jest.mock("./generateTestMigrationFile.js", () => ({
  generateTestMigrationFile: jest.fn(),
}));

test.each([true, false])(
  "generates without a client with silent=%s",
  async (silent) => {
    const client = { release: jest.fn().mockResolvedValue(undefined) };
    jest.mocked(getDbClient).mockReturnValue(client as never);
    jest.mocked(generateTestMigrationFile).mockResolvedValue(undefined);
    jest.spyOn(Console, "success").mockImplementation(() => {});
    await generateTestMigFileCommand({ silent });
    expect(generateTestMigrationFile).toHaveBeenCalledWith(
      expect.any(SqlGenerator),
    );
    expect(getDbClient).not.toHaveBeenCalled();
    expect(Console.success).toHaveBeenCalledTimes(silent ? 0 : 1);
  },
);

test("propagates failures without creating a client or exiting the process", async () => {
  const client = { release: jest.fn().mockResolvedValue(undefined) };
  jest.mocked(getDbClient).mockReturnValue(client as never);
  jest
    .mocked(generateTestMigrationFile)
    .mockRejectedValueOnce(new Error("generation failed"));
  await expect(generateTestMigFileCommand({ silent: true })).rejects.toThrow(
    "generation failed",
  );
  expect(getDbClient).not.toHaveBeenCalled();
});
