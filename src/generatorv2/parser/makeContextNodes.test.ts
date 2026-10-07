import { DataStoreHandler } from "../../migration/dataStore.js";
import { StoreMigrator } from "../../migration/front/storeMigrator.js";
import { Mutations } from "../../migration/makeMutaion.js";
import { makeContextNodes } from "./makeContextNodes.js";

function fixture(bigint: boolean) {
  const store = StoreMigrator.deserialize({ tables: [] });
  for (const name of ["first", "second"])
    store.createTable(name, (t) => {
      const column = t.column("tenant_id");
      if (name === "second" && bigint) column.bigInt();
      else column.int();
      const contextFields = [{ column: "tenant_id", contextName: "tenantId" }];
      t.addGQLMutation(
        Mutations.create({ contextFields }),
        Mutations.update({ contextFields }),
      );
    });
  return new DataStoreHandler(store.serialize());
}
test("shared context fields are declared once across create/update and tables", () => {
  expect(makeContextNodes(fixture(false))).toEqual([
    { name: "tenantId", dbtype: "int" },
  ]);
});
test("conflicting context types fail instead of producing unusable declarations", () => {
  expect(() => makeContextNodes(fixture(true))).toThrow(
    "Conflicting context types for tenantId",
  );
});
