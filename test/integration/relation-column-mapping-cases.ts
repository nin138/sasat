import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { DBClient } from "../../src/db/connectors/dbClient.js";
import { MysqlPoolClient } from "../../src/db/connectors/mysql/poolClient.js";
import { PostgresClient } from "../../src/db/connectors/postgres/client.js";
import type { DatabaseDialect } from "../../src/db/dialect.js";
import { executeSelect } from "../../src/db/executeSelect.js";
import { generateRelationMap } from "../../src/generatorv2/codegen/ts/relationMap/index.js";
import { parse } from "../../src/generatorv2/parse.js";
import { DataStoreHandler } from "../../src/migration/dataStore.js";
import { StoreMigrator } from "../../src/migration/front/storeMigrator.js";
import { Conditions as C } from "../../src/migration/makeCondition.js";
import { QExpr as qe } from "../../src/runtime/dsl/factory.js";
import type {
  RelationMap,
  TableInfo,
} from "../../src/runtime/dsl/query/createQueryResolveInfo.js";
import {
  createPagingFieldQuery,
  createQuery,
} from "../../src/runtime/sql/runQuery.js";

export async function verifyRelationColumnMapping(dialect: DatabaseDialect) {
  const postgres = dialect === "postgres";
  const settings = {
    host:
      process.env[postgres ? "TEST_PG_HOST" : "TEST_DB_HOST"] ?? "127.0.0.1",
    port: Number(
      process.env[postgres ? "TEST_PG_PORT" : "TEST_DB_PORT"] ??
        (postgres ? 5432 : 3308),
    ),
    user:
      process.env[postgres ? "TEST_PG_USER" : "TEST_DB_USER"] ??
      (postgres ? "postgres" : "root"),
    password:
      process.env[postgres ? "TEST_PG_PASSWORD" : "TEST_DB_PASSWORD"] ?? "",
  };
  const connect = (database?: string): DBClient =>
    postgres
      ? new PostgresClient({ ...settings, database: database ?? "postgres" })
      : new MysqlPoolClient({ ...settings, database });
  const database = `sasat_rel_${randomUUID().replaceAll("-", "")}`;
  const admin = connect();
  let client: DBClient | undefined;
  let created = false;
  try {
    await admin.rawQuery(`CREATE DATABASE ${admin.sql.escapeId(database)}`);
    created = true;
    client = connect(database);
    const store = StoreMigrator.deserialize({ tables: [] }, client.sql);
    store.createTable("owners", (table) => {
      table.column("owner_pk").int().primary().fieldName("id");
      table.column("owner_score").int().fieldName("score");
    });
    store.createTable("records", (table) => {
      table.column("record_pk").int().primary().fieldName("id");
      table.column("record_score").int().fieldName("score");
      table
        .references({
          columnName: "owner_fk",
          parentTable: "owners",
          parentColumn: "owner_pk",
          fieldName: "owner",
          parentFieldName: "records",
          relation: "Many",
        })
        .fieldName("ownerId");
      table.addVirtualRelation({
        parentTable: "owners",
        childFieldName: "matchingOwners",
        parentFieldName: "matchingRecords",
        conditions: [
          C.rel.comparison(
            C.value.parent("score"),
            ">",
            C.value.child("score"),
          ),
        ],
      });
    });
    for (const sql of store.getSql()) await client.rawQuery(sql);
    await client.rawCommand("INSERT INTO owners VALUES (1,5),(2,9)");
    await client.rawCommand("INSERT INTO records VALUES (10,0,1),(11,8,2)");
    const exports = {} as { relationMap: RelationMap; tableInfo: TableInfo };
    runInNewContext(
      ts.transpileModule(
        generateRelationMap(
          parse(new DataStoreHandler(store.serialize(), client.sql)),
        ).toString(),
        { compilerOptions: { module: ts.ModuleKind.CommonJS } },
      ).outputText,
      {
        exports,
        require: (name: string) => {
          if (name === "sasat") return { qe };
          throw new Error(`Unexpected import: ${name}`);
        },
      },
    );
    const { relationMap, tableInfo } = exports;
    const automaticFields = {
      fields: ["id"] as never[],
      relations: {
        matchingOwners: { fields: ["id"], tableAlias: "t0" },
        owner: undefined,
      },
    };
    const automatic = createQuery(
      "records",
      automaticFields,
      undefined,
      tableInfo,
      relationMap,
    );
    assert.notEqual(automatic.from.alias, "t0");
    const autoRows = await executeSelect(client, automatic);
    assert.deepEqual(
      autoRows
        .map((row) => [row[`${automatic.from.alias}__id`], row.t0__id])
        .sort(),
      [
        [10, 1],
        [10, 2],
        [11, 2],
      ],
    );
    const autoPage = createPagingFieldQuery({
      baseTableName: "records",
      fields: automaticFields,
      tableInfo,
      relationMap,
      pagingOption: {
        numberOfItem: 1,
        offset: 1,
        sort: [qe.sort(qe.field(automatic.from.alias, "record_pk"))],
      },
    });
    const autoPageRows = await executeSelect(client, autoPage);
    assert.deepEqual(
      autoPageRows.map((row) => [
        row[`${autoPage.from.alias}__id`],
        row.t0__id,
      ]),
      [[11, 2]],
    );
    for (const reverse of [false, true]) {
      const fields = {
        fields: ["id"] as never[],
        tableAlias: reverse ? "o" : "r",
        relations: {
          [reverse ? "matchingRecords" : "matchingOwners"]: {
            fields: ["id"],
            tableAlias: reverse ? "r" : "o",
          },
        },
      };
      const query = createQuery(
        reverse ? "owners" : "records",
        fields,
        {
          sort: [
            qe.sort(qe.field("r", "record_pk")),
            qe.sort(qe.field("o", "owner_pk")),
          ],
        },
        tableInfo,
        relationMap,
      );
      const rows = await executeSelect(client, query);
      assert.deepEqual(
        rows.map((row) => [row.r__id, row.o__id]),
        [
          [10, 1],
          [10, 2],
          [11, 2],
        ],
      );
    }
    const fields = {
      fields: ["id"] as never[],
      tableAlias: "r",
      relations: { matchingOwners: { fields: ["id"], tableAlias: "o" } },
    };
    const paged = await executeSelect(
      client,
      createPagingFieldQuery({
        baseTableName: "records",
        fields,
        tableInfo,
        relationMap,
        pagingOption: {
          numberOfItem: 1,
          offset: 1,
          sort: [qe.sort(qe.field("r", "record_pk"))],
        },
      }),
    );
    assert.deepEqual(
      paged.map((row) => [row.r__id, row.o__id]),
      [[11, 2]],
    );
    const owners = await executeSelect(client, {
      select: [qe.field("o", "owner_pk")],
      from: qe.table("owners", [], "o"),
      where: relationMap.records.owner.condition({
        parent: { ownerId: 1 },
        childTableAlias: "o",
      }),
    });
    assert.deepEqual(
      owners.map((row) => row.owner_pk),
      [1],
    );
    const records = await executeSelect(client, {
      select: [qe.field("r", "record_pk")],
      from: qe.table("records", [], "r"),
      where: relationMap.owners.records.condition({
        parent: { id: 1 },
        childTableAlias: "r",
      }),
    });
    assert.deepEqual(
      records.map((row) => row.record_pk),
      [10],
    );
  } finally {
    try {
      await client?.release();
      if (created)
        await admin.rawQuery(`DROP DATABASE ${admin.sql.escapeId(database)}`);
    } finally {
      await admin.release();
    }
  }
}
