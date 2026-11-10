import { runInNewContext } from "node:vm";
import ts from "typescript";
import { DataStoreHandler } from "../../../../migration/dataStore.js";
import { StoreMigrator } from "../../../../migration/front/storeMigrator.js";
import { Conditions as C } from "../../../../migration/makeCondition.js";
import { QExpr as qe } from "../../../../runtime/dsl/factory.js";
import type { RelationMap } from "../../../../runtime/dsl/query/createQueryResolveInfo.js";
import { Sql } from "../../../../runtime/dsl/query/sql/nodeToSql.js";
import type { JoinConditionNode } from "../../../nodes/JoinConditionNode.js";
import { parse } from "../../../parse.js";
import { generateRelationMap } from "./index.js";

function setup(conditions?: JoinConditionNode[]) {
  const store = StoreMigrator.deserialize({ tables: [] });
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
    if (conditions)
      table.addVirtualRelation({
        parentTable: "owners",
        childFieldName: "matchingOwners",
        parentFieldName: "matchingRecords",
        conditions,
      });
  });
  const exports = {} as { relationMap: RelationMap };
  runInNewContext(
    ts.transpileModule(
      generateRelationMap(
        parse(new DataStoreHandler(store.serialize())),
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
  return exports.relationMap;
}
const sql = (value: ReturnType<RelationMap[string][string]["condition"]>) =>
  Sql.booleanValue(value).replace(/\s+/g, " ");

test.each([true, false])(
  "virtual joins map same field names to each table's own column (databaseNames=%s)",
  (databaseNames) => {
    const map = setup([
      C.rel.comparison(
        C.value.parent(databaseNames ? "owner_score" : "score"),
        ">",
        C.value.child(databaseNames ? "record_score" : "score"),
      ),
    ]);
    expect(
      sql(
        map.records.matchingOwners.condition({
          parentTableAlias: "r",
          childTableAlias: "o",
        }),
      ),
    ).toBe("`o`.`owner_score` > `r`.`record_score`");
    expect(
      sql(
        map.owners.matchingRecords.condition({
          parentTableAlias: "o",
          childTableAlias: "r",
        }),
      ),
    ).toBe("`o`.`owner_score` > `r`.`record_score`");
    expect(
      sql(
        map.records.matchingOwners.condition({
          parent: { score: 0 },
          childTableAlias: "o",
        }),
      ),
    ).toBe("`o`.`owner_score` > 0");
    expect(
      sql(
        map.owners.matchingRecords.condition({
          parent: { score: 9 },
          childTableAlias: "r",
        }),
      ),
    ).toBe("9 > `r`.`record_score`");
  },
);
test("foreign key conditions read renamed entity properties when no source alias is supplied", () => {
  const map = setup();
  expect(
    sql(
      map.records.owner.condition({
        parent: { ownerId: 0 },
        childTableAlias: "o",
      }),
    ),
  ).toBe("`o`.`owner_pk` = 0");
  expect(
    sql(
      map.owners.records.condition({ parent: { id: 7 }, childTableAlias: "r" }),
    ),
  ).toBe("`r`.`owner_fk` = 7");
});
test("ranges, IN and NULL conditions resolve the target table independently", () => {
  const conditions = [
    C.rel.between(
      C.value.parent("score"),
      C.range.values(C.value.child("score"), C.value.fixed(9)),
    ),
    C.rel.in(C.value.child("score"), [
      C.value.parent("score"),
      C.value.fixed(0),
    ]),
    C.rel.isNotNull(C.value.parent("score")),
  ];
  const map = setup(conditions);
  expect(
    sql(
      map.records.matchingOwners.condition({
        parentTableAlias: "r",
        childTableAlias: "o",
      }),
    ),
  ).toBe(
    "`o`.`owner_score` BETWEEN `r`.`record_score` AND 9 AND (`r`.`record_score` = `o`.`owner_score` OR `r`.`record_score` = 0) AND `o`.`owner_score` IS NOT NULL",
  );
});
