import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "../../config/config.js";
import { getDbClient } from "../../db/getDbClient.js";
import { readYmlFile } from "../../util/fsUtil.js";
import { Console } from "../console.js";
import { dumpDB } from "./dumpDb.js";

jest.mock("../../db/getDbClient.js", () => ({ getDbClient: jest.fn() }));

let dir: string;
let original: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "sasat-dump-"));
  original = config().migration.dir;
  config().migration.dir = dir;
  jest.spyOn(Console, "error").mockImplementation(() => {});
});
afterEach(() => {
  config().migration.dir = original;
  rmSync(dir, { recursive: true, force: true });
});

test("dumps supported tables and skips those without primary keys", async () => {
  const client = {
    rawQuery: jest
      .fn()
      .mockResolvedValueOnce([{ table: "users" }, { table: "logs" }])
      .mockResolvedValueOnce([
        {
          "Create Table":
            "CREATE TABLE users (id int NOT NULL, PRIMARY KEY (id))",
        },
      ])
      .mockResolvedValueOnce([
        { "Create Table": "CREATE TABLE logs (message text)" },
      ]),
    release: jest.fn().mockResolvedValue(undefined),
  };
  jest.mocked(getDbClient).mockReturnValue(client as never);
  await dumpDB();
  const schema = readYmlFile(join(dir, "initialSchema.yml"));
  expect(schema.tables).toHaveLength(1);
  expect(schema.tables[0].tableName).toBe("users");
  expect(client.rawQuery).toHaveBeenCalledWith("show create table `users`");
  expect(Console.error).toHaveBeenCalledWith(
    expect.stringContaining("missing primary key"),
  );
  expect(client.release).toHaveBeenCalledTimes(1);
});

test("releases the client and propagates query failures", async () => {
  const client = {
    rawQuery: jest.fn().mockRejectedValue(new Error("offline")),
    release: jest.fn().mockResolvedValue(undefined),
  };
  jest.mocked(getDbClient).mockReturnValue(client as never);
  await expect(dumpDB()).rejects.toThrow("offline");
  expect(client.release).toHaveBeenCalledTimes(1);
});
