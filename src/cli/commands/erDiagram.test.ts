import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "../../config/config.js";
import { StoreMigrator } from "../../migration/front/storeMigrator.js";
import { writeDiagram } from "./erDiagram.js";
import { getCurrentStore } from "./getCurrentStore.js";

jest.mock("./getCurrentStore.js", () => ({ getCurrentStore: jest.fn() }));

test("writes entities and their relationship cardinality as Mermaid", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sasat-diagram-"));
  const original = config().migration.out;
  config().migration.out = dir;
  mkdirSync(join(dir, "__generated__"));
  try {
    const store = StoreMigrator.deserialize({ tables: [] });
    store.createTable("users", (t) => t.column("id").int().primary());
    store.createTable("posts", (t) => {
      t.column("id").int().primary();
      t.references({
        columnName: "userId",
        parentTable: "users",
        parentColumn: "id",
        relation: "Many",
      });
    });
    jest.mocked(getCurrentStore).mockResolvedValue(store.serialize());
    await writeDiagram();
    const result = readFileSync(
      join(dir, "__generated__/er-diagram.mermaid"),
      "utf8",
    );
    expect(result).toContain("erDiagram");
    expect(result).toContain("users {");
    expect(result).toContain("users || -- o{ posts");
  } finally {
    config().migration.out = original;
    rmSync(dir, { recursive: true, force: true });
  }
});
