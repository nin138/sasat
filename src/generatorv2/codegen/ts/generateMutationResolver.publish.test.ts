import { runInNewContext } from "node:vm";
import ts from "typescript";
import { DataStoreHandler } from "../../../migration/dataStore.js";
import { StoreMigrator } from "../../../migration/front/storeMigrator.js";
import { Mutations } from "../../../migration/makeMutaion.js";
import { makeResolver } from "../../../runtime/makeResolver.js";
import { publishAfterWrite } from "../../../runtime/publishAfterWrite.js";
import { pick } from "../../../runtime/util.js";
import { parse } from "../../parse.js";
import { generateMutationResolver } from "./generateMutationResolver.js";

function fixture(refetch: boolean) {
  const store = StoreMigrator.deserialize({ tables: [] });
  store.createTable("item", (t) => {
    t.column("id").int().primary().autoIncrement();
    t.column("name").varchar(30);
    t.enableGQL();
    t.addGQLMutation(
      Mutations.create({ subscription: true, noRefetch: !refetch }),
      Mutations.update({ subscription: true, noRefetch: !refetch }),
      Mutations.delete({ subscription: true }),
    );
  });
  const saved = { id: 1, name: "saved" };
  const fetched = { id: 1, name: "fetched" };
  const create = jest.fn().mockResolvedValue(saved);
  const update = jest.fn().mockResolvedValue({ changedRows: 1 });
  const remove = jest.fn().mockResolvedValue({ affectedRows: 1 });
  const findById = jest.fn().mockResolvedValue(fetched);
  const publish = jest.fn().mockResolvedValue(undefined);
  const exports = {} as {
    mutation: Record<string, (...args: unknown[]) => Promise<unknown>>;
  };
  const code = generateMutationResolver(
    parse(new DataStoreHandler(store.serialize())),
  ).toString();
  runInNewContext(
    ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === "sasat") return { makeResolver, pick, publishAfterWrite };
        if (name.includes("dataSources/db/Item"))
          return {
            ItemDBDataSource: class {
              create = create;
              update = update;
              delete = remove;
              findById = findById;
            },
          };
        if (name.includes("subscription"))
          return {
            publishItemCreated: publish,
            publishItemUpdated: publish,
            publishItemDeleted: publish,
          };
        throw new Error("Unexpected import: " + name);
      },
    },
  );
  return {
    saved,
    fetched,
    create,
    update,
    remove,
    findById,
    publish,
    mutation: exports.mutation,
  };
}

for (const refetch of [true, false]) {
  test.each(["create", "update", "delete"])(
    "%s keeps its result when notification fails (refetch=" + refetch + ")",
    async (operation) => {
      const s = fixture(refetch);
      const logger = jest.spyOn(console, "error").mockImplementation(() => {});
      s.publish.mockRejectedValue(new Error("unavailable"));
      const expected =
        operation === "create"
          ? refetch
            ? s.fetched
            : s.saved
          : operation === "update" && refetch
            ? s.fetched
            : true;
      await expect(
        s.mutation[operation + "Item"](
          null,
          { item: { id: 1, name: "input" } },
          {},
        ),
      ).resolves.toEqual(expected);
      expect(s.publish).toHaveBeenCalledTimes(1);
      expect(logger).toHaveBeenCalledTimes(1);
      expect(
        s[
          operation === "delete" ? "remove" : (operation as "create" | "update")
        ],
      ).toHaveBeenCalledTimes(1);
    },
  );
}

test.each(["create", "update", "delete"])(
  "%s database failures still reject and do not publish",
  async (operation) => {
    const s = fixture(true);
    const logger = jest.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("database failed");
    s[
      operation === "delete" ? "remove" : (operation as "create" | "update")
    ].mockRejectedValue(error);
    await expect(
      s.mutation[operation + "Item"](null, { item: { id: 1 } }, {}),
    ).rejects.toBe(error);
    expect(s.publish).not.toHaveBeenCalled();
    expect(logger).not.toHaveBeenCalled();
  },
);

test("result refetch failures are not swallowed as notification failures", async () => {
  const s = fixture(true);
  s.findById.mockRejectedValue(new Error("read failed"));
  await expect(
    s.mutation.createItem(null, { item: { name: "input" } }, {}),
  ).rejects.toThrow("read failed");
  expect(s.publish).not.toHaveBeenCalled();
});

test("custom publishers may throw synchronously and missing deletes do not notify", async () => {
  const s = fixture(false);
  jest.spyOn(console, "error").mockImplementation(() => {});
  s.publish.mockImplementation(() => {
    throw new Error("sync failure");
  });
  await expect(
    s.mutation.createItem(null, { item: { name: "input" } }, {}),
  ).resolves.toEqual(s.saved);
  s.publish.mockClear();
  s.remove.mockResolvedValue({ affectedRows: 0 });
  await expect(
    s.mutation.deleteItem(null, { item: { id: 9 } }, {}),
  ).resolves.toBe(false);
  expect(s.publish).not.toHaveBeenCalled();
});
