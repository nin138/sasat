import { config } from "../../config/config.js";
import type { DBClient } from "../../db/connectors/dbClient.js";
import { CodeGen_v2 } from "../../generatorv2/codegen_v2.js";
import { MigrationController } from "../../migration/controller.js";
import { createCurrentMigrationDataStore } from "../../migration/exec/createCurrentMigrationDataStore.js";
import { getCurrentMigration } from "../../migration/exec/getCurrentMigration.js";
import { getMigrationFileNames } from "../../migration/exec/getMigrationFiles.js";
import { compileMigrationFiles } from "../../migration/exec/migrationFileCompiler.js";
import { withMigrationLock } from "../../migration/exec/withMigrationLock.js";
import { StoreMigrator } from "../../migration/front/storeMigrator.js";
import { writeCurrentSchema } from "../../util/fsUtil.js";
import { Console } from "../console.js";
import { writeDiagram } from "./erDiagram.js";
import { generate } from "./generate.js";
import { generateTestMigFileCommand } from "./generateTestMigFileCommand.js";
import { getCurrentStore } from "./getCurrentStore.js";
import { migrate } from "./migrate.js";
import { migrationBuild } from "./migrationBuild.js";

jest.mock("../../migration/exec/migrationFileCompiler.js", () => ({
  compileMigrationFiles: jest.fn(),
}));
jest.mock("../../migration/exec/getCurrentMigration.js", () => ({
  getCurrentMigration: jest.fn(),
}));
jest.mock("../../migration/exec/getMigrationFiles.js", () => ({
  getMigrationFileNames: jest.fn(),
}));
jest.mock("../../migration/exec/createCurrentMigrationDataStore.js", () => ({
  createCurrentMigrationDataStore: jest.fn(),
}));
jest.mock("./generateTestMigFileCommand.js", () => ({
  generateTestMigFileCommand: jest.fn(),
}));
jest.mock("../../util/fsUtil.js", () => ({
  ...jest.requireActual("../../util/fsUtil.js"),
  writeCurrentSchema: jest.fn(),
}));

jest.mock("../../migration/exec/withMigrationLock.js", () => ({
  withMigrationLock: jest.fn(async (client, apply) => apply(client)),
}));

const empty = { tables: [] };
const options = {
  silent: true,
  dry: false,
  generateFiles: true,
  skipBuild: false,
};
beforeEach(() => {
  jest.mocked(compileMigrationFiles).mockResolvedValue([]);
  jest.mocked(getMigrationFileNames).mockReturnValue(["001.ts", "002.ts"]);
  jest.mocked(getCurrentMigration).mockResolvedValue("001.ts");
  jest
    .mocked(createCurrentMigrationDataStore)
    .mockResolvedValue(StoreMigrator.deserialize(empty));
  jest
    .spyOn(MigrationController.prototype, "migrate")
    .mockResolvedValue({ store: empty, currentMigration: "002.ts" });
  jest.spyOn(CodeGen_v2.prototype, "generate").mockResolvedValue(undefined);
  jest.spyOn(Console, "success").mockImplementation(() => {});
  jest.spyOn(Console, "error").mockImplementation(() => {});
  jest.spyOn(Console, "log").mockImplementation(() => {});
});

test("builds migrations and generates schema/code from the resulting store", async () => {
  await migrate({} as DBClient, options);
  expect(withMigrationLock).toHaveBeenCalledTimes(1);
  expect(compileMigrationFiles).toHaveBeenCalledTimes(1);
  expect(MigrationController.prototype.migrate).toHaveBeenCalledWith(
    {},
    "001.ts",
    options,
  );
  expect(writeCurrentSchema).toHaveBeenCalledWith(empty);
  expect(CodeGen_v2.prototype.generate).toHaveBeenCalledTimes(1);
});

test("honors skip-build and no-code-generation options", async () => {
  await migrate({} as DBClient, {
    ...options,
    skipBuild: true,
    generateFiles: false,
  });
  expect(compileMigrationFiles).not.toHaveBeenCalled();
  expect(writeCurrentSchema).not.toHaveBeenCalled();
  expect(CodeGen_v2.prototype.generate).not.toHaveBeenCalled();
});

test("propagates build failures before running migrations", async () => {
  jest
    .mocked(compileMigrationFiles)
    .mockRejectedValueOnce(new Error("compile failed"));
  await expect(migrate({} as DBClient, options)).rejects.toThrow(
    "compile failed",
  );
  expect(MigrationController.prototype.migrate).not.toHaveBeenCalled();
});

test("loads the configured target or the most recent migration", async () => {
  const target = config().migration.target;
  try {
    config().migration.target = "001.ts";
    await expect(getCurrentStore()).resolves.toEqual(empty);
    expect(createCurrentMigrationDataStore).toHaveBeenLastCalledWith("001.ts");
    config().migration.target = undefined;
    await getCurrentStore();
    expect(createCurrentMigrationDataStore).toHaveBeenLastCalledWith("002.ts");
  } finally {
    config().migration.target = target;
  }
});

test("generates the application and test migration files", async () => {
  await generate();
  expect(writeCurrentSchema).toHaveBeenCalledWith(empty);
  expect(CodeGen_v2.prototype.generate).toHaveBeenCalledTimes(1);
  expect(generateTestMigFileCommand).toHaveBeenCalledWith({ silent: true });
});

test("reports migration build success only after compilation", async () => {
  await migrationBuild();
  expect(compileMigrationFiles).toHaveBeenCalledTimes(1);
  expect(Console.success).toHaveBeenCalledWith("Done!");
});

test("dry run skips schema and application generation even when requested", async () => {
  await migrate({} as DBClient, { ...options, dry: true });
  expect(MigrationController.prototype.migrate).toHaveBeenCalledWith(
    {},
    "001.ts",
    expect.objectContaining({ dry: true }),
  );
  expect(withMigrationLock).not.toHaveBeenCalled();
  expect(writeCurrentSchema).not.toHaveBeenCalled();
  expect(CodeGen_v2.prototype.generate).not.toHaveBeenCalled();
});

test.each([getCurrentStore, generate, writeDiagram])(
  "rejects unknown targets before compiling or overwriting generated artifacts (%p)",
  async (run) => {
    const previous = config().migration.target;
    try {
      config().migration.target = "missing.ts";
      await expect(run()).rejects.toThrow("migration target not found");
      expect(compileMigrationFiles).not.toHaveBeenCalled();
      expect(createCurrentMigrationDataStore).not.toHaveBeenCalled();
      expect(writeCurrentSchema).not.toHaveBeenCalled();
      expect(CodeGen_v2.prototype.generate).not.toHaveBeenCalled();
      expect(generateTestMigFileCommand).not.toHaveBeenCalled();
    } finally {
      config().migration.target = previous;
    }
  },
);

test("loads an empty migration directory without a target", async () => {
  const previous = config().migration.target;
  try {
    config().migration.target = undefined;
    jest.mocked(getMigrationFileNames).mockReturnValue([]);
    await expect(getCurrentStore()).resolves.toEqual(empty);
    expect(createCurrentMigrationDataStore).toHaveBeenCalledWith(undefined);
  } finally {
    config().migration.target = previous;
  }
});
