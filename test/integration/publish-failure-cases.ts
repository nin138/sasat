import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { buildSchema, graphql } from "graphql";
import ts from "typescript";
import type { SQLExecutor } from "../../src/db/connectors/dbClient.js";
import type { DatabaseDialect } from "../../src/db/dialect.js";
import { createSqlGenerator } from "../../src/db/sqlGenerator.js";
import { generateMutationResolver } from "../../src/generatorv2/codegen/ts/generateMutationResolver.js";
import { generateTypeDefs } from "../../src/generatorv2/codegen/ts/generateTypeDefs.js";
import { parse } from "../../src/generatorv2/parse.js";
import { DataStoreHandler } from "../../src/migration/dataStore.js";
import { StoreMigrator } from "../../src/migration/front/storeMigrator.js";
import { Mutations } from "../../src/migration/makeMutaion.js";
import { Queries } from "../../src/migration/makeQuery.js";
import { createPubSub } from "../../src/runtime/createPubSub.js";
import { createTypeDef } from "../../src/runtime/createTypeDef.js";
import { QExpr } from "../../src/runtime/dsl/factory.js";
import { makeResolver } from "../../src/runtime/makeResolver.js";
import { publishAfterWrite } from "../../src/runtime/publishAfterWrite.js";
import { SasatDBDatasource } from "../../src/runtime/sasatDBDatasource.js";
import { pick } from "../../src/runtime/util.js";

type Row = { id: number; name: string };
class NotificationItemDBDataSource extends SasatDBDatasource<
  Row,
  { id: number },
  { name: string },
  { id: number; name?: string },
  { fields: (keyof Row)[] },
  Row
> {
  tableName = "notification_item";
  fields = ["id", "name"];
  primaryKeys = ["id"];
  identifyFields = ["id"];
  autoIncrementColumn = "id";
  relationMap = { notification_item: {} };
  tableInfo = {
    notification_item: {
      identifiableKeys: ["id"],
      identifiableFields: ["id"],
      columnMap: { id: "id", name: "name" },
    },
  };
  getDefaultValueString() {
    return {};
  }
}

export async function verifyPublishFailure(
  executor: SQLExecutor,
  dialect: DatabaseDialect,
) {
  const sql = createSqlGenerator(dialect);
  const store = StoreMigrator.deserialize({ tables: [] }, sql);
  store.createTable("notification_item", (t) => {
    t.column("id").int().primary().autoIncrement();
    t.column("name").varchar(40).unique();
    t.enableGQL();
    t.addGQLQuery(Queries.primary());
    t.addGQLMutation(
      Mutations.create({ subscription: true, noRefetch: true }),
      Mutations.update({ subscription: true, noRefetch: true }),
      Mutations.delete({ subscription: true }),
    );
  });
  for (const query of store.getSql()) await executor.rawQuery(query);
  // A closed real Redis client rejects immediately without touching a shared server.
  const pubsub = createPubSub({
    backend: "redis",
    redisUrl: "redis://127.0.0.1:1",
  });
  await pubsub.close();
  let attempts = 0;
  const publish = async (event: string, payload: unknown) => {
    attempts++;
    await pubsub.publish(event, payload);
  };
  const oldError = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };
  try {
    await assert.rejects(pubsub.publish("direct", {}));
    const root = parse(new DataStoreHandler(store.serialize(), sql));
    const schemaExports = {} as {
      typeDefs: Parameters<typeof createTypeDef>[0];
      inputs: Parameters<typeof createTypeDef>[1];
    };
    runInNewContext(
      ts.transpileModule(generateTypeDefs(root).toString(), {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }).outputText,
      { exports: schemaExports },
    );
    const schema = buildSchema(
      createTypeDef(schemaExports.typeDefs, schemaExports.inputs),
    );
    const mutationExports = {} as {
      mutation: Record<string, (...args: unknown[]) => Promise<unknown>>;
    };
    runInNewContext(
      ts.transpileModule(generateMutationResolver(root).toString(), {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }).outputText,
      {
        exports: mutationExports,
        require: (name: string) => {
          if (name === "sasat")
            return { makeResolver, pick, publishAfterWrite };
          if (name.includes("dataSources/db/NotificationItem"))
            return {
              NotificationItemDBDataSource: class extends NotificationItemDBDataSource {
                constructor() {
                  super({
                    ...executor,
                    sql,
                    supportsParameterizedStatements:
                      executor.supportsParameterizedStatements,
                    executeQuery: executor.executeQuery?.bind(executor),
                    executeCommand: executor.executeCommand?.bind(executor),
                    rawQuery: (query) => executor.rawQuery(query),
                    rawCommand: (query) => executor.rawCommand(query),
                  });
                }
                findById(id: number) {
                  return this.first(undefined, {
                    where: QExpr.eq(QExpr.field("t0", "id"), QExpr.value(id)),
                  });
                }
              },
            };
          if (name.includes("subscription"))
            return {
              publishNotificationItemCreated: (entity: unknown) =>
                publish("NotificationItemCreated", entity),
              publishNotificationItemUpdated: (entity: unknown) =>
                publish("NotificationItemUpdated", entity),
              publishNotificationItemDeleted: (entity: unknown) =>
                publish("NotificationItemDeleted", entity),
            };
          throw new Error("Unexpected generated import: " + name);
        },
      },
    );
    const rootValue = Object.fromEntries(
      Object.entries(mutationExports.mutation).map(([name, fn]) => [
        name,
        (args: unknown) => fn(null, args, {}),
      ]),
    );
    const call = (source: string) => graphql({ schema, source, rootValue });
    const created = await call(
      'mutation { createNotificationItem(notificationItem:{name:"saved"}) {id name} }',
    );
    assert.equal(created.errors, undefined);
    const id = (created.data as { createNotificationItem: Row })
      .createNotificationItem.id;
    assert.equal(attempts, 1);
    assert.deepEqual(
      await executor.rawQuery(
        `SELECT name FROM ${sql.escapeId("notification_item")}`,
      ),
      [{ name: "saved" }],
    );
    const duplicate = await call(
      'mutation { createNotificationItem(notificationItem:{name:"saved"}) {id} }',
    );
    assert.equal(duplicate.errors?.length, 1);
    assert.equal(attempts, 1);
    const updated = await call(
      `mutation { updateNotificationItem(notificationItem:{id:${id},name:"updated"}) }`,
    );
    assert.equal(updated.errors, undefined);
    assert.equal(updated.data?.updateNotificationItem, true);
    assert.deepEqual(
      await executor.rawQuery(
        `SELECT name FROM ${sql.escapeId("notification_item")}`,
      ),
      [{ name: "updated" }],
    );
    const removed = await call(
      `mutation { deleteNotificationItem(notificationItem:{id:${id}}) }`,
    );
    assert.equal(removed.errors, undefined);
    assert.equal(removed.data?.deleteNotificationItem, true);
    assert.deepEqual(
      await executor.rawQuery(
        `SELECT id FROM ${sql.escapeId("notification_item")}`,
      ),
      [],
    );
    assert.equal(attempts, 3);
    assert.equal(
      logged.filter(
        (args) =>
          args[0] ===
          "[sasat] Subscription publish failed after database write:",
      ).length,
      3,
    );
  } finally {
    console.error = oldError;
    await pubsub.close();
    for (const query of sql.dropTable("notification_item"))
      await executor.rawQuery(query);
  }
}
