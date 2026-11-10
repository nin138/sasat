import { runInNewContext } from "node:vm";
import ts from "typescript";
import { DataStoreHandler } from "../../../../migration/dataStore.js";
import { StoreMigrator } from "../../../../migration/front/storeMigrator.js";
import { Conditions as C } from "../../../../migration/makeCondition.js";
import { QExpr as qe } from "../../../../runtime/dsl/factory.js";
import type { BooleanValueExpression } from "../../../../runtime/dsl/query/query.js";
import { Sql } from "../../../../runtime/dsl/query/sql/nodeToSql.js";
import type { JoinConditionNode } from "../../../nodes/JoinConditionNode.js";
import { parse } from "../../../parse.js";
import { generateRelationMap } from "./index.js";

function setup(conditions: JoinConditionNode[], helpers = {}) {
  const store = StoreMigrator.deserialize({ tables: [] });
  for (const name of ["parents", "children"])
    store.createTable(name, (table) => {
      table.column("id").int().primary();
      table
        .column("optional_value")
        .int()
        .fieldName("optionalValue")
        .nullable();
      table
        .column("alternate_value")
        .int()
        .fieldName("alternateValue")
        .nullable();
    });
  const ds = new DataStoreHandler(store.serialize());
  ds.table("children").addVirtualRelation({
    parentTable: "parents",
    childFieldName: "parents",
    parentFieldName: "children",
    conditions,
  });
  const exports = {} as {
    relationMap: Record<
      string,
      Record<
        string,
        {
          requiredColumns: string[];
          condition(arg: object): BooleanValueExpression;
        }
      >
    >;
  };
  const code = generateRelationMap(parse(ds)).toString();
  runInNewContext(
    ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === "sasat") return { qe, ...helpers };
        if (/conditions(\.js)?$/.test(name)) return helpers;
        throw new Error(`Unexpected import: ${name}`);
      },
    },
  );
  return exports.relationMap;
}
const sql = (value: BooleanValueExpression) =>
  Sql.booleanValue(value).replace(/\s+/g, " ");

test.each([false, true])(
  "NULL predicate keeps its source dependency (not=%s)",
  (not) => {
    const condition = (not ? C.rel.isNotNull : C.rel.isNull)(
      C.value.child("optionalValue"),
    );
    const map = setup([condition]);
    expect(map.children.parents.requiredColumns).toContain("optional_value");
    expect(
      sql(
        map.children.parents.condition({
          parent: { optionalValue: null },
          childTableAlias: "target",
        }),
      ),
    ).toBe(`NULL IS ${not ? "NOT " : ""}NULL`);
    const reverse = setup([
      (not ? C.rel.isNotNull : C.rel.isNull)(C.value.parent("optionalValue")),
    ]);
    expect(reverse.parents.children.requiredColumns).toContain(
      "optional_value",
    );
  },
);
test.each([true, false])(
  "IN supports field values with and without a source alias (joined=%s)",
  (joined) => {
    const map = setup([
      C.rel.in(C.value.parent("id"), [
        C.value.child("optionalValue"),
        C.value.parent("alternateValue"),
        C.value.fixed(7),
      ]),
    ]);
    const relation = map.children.parents;
    expect(relation.requiredColumns).toContain("optional_value");
    const result = sql(
      relation.condition({
        parentTableAlias: joined ? "source" : undefined,
        childTableAlias: "target",
        parent: { optionalValue: 0 },
      }),
    );
    expect(result).toBe(
      "`target`.`id` = " +
        (joined ? "`source`.`optional_value`" : "0") +
        " OR `target`.`id` = `target`.`alternate_value` OR `target`.`id` = 7",
    );
  },
);
test.each([
  { values: [] },
  { values: [C.value.fixed(0), C.value.contextOrDefault("tenant", 7)] },
])("IN literal and empty lists remain executable: %j", ({ values }) => {
  const relation = setup([C.rel.in(C.value.parent("id"), values)]).children
    .parents;
  expect(
    sql(
      relation.condition({ childTableAlias: "target", context: { tenant: 3 } }),
    ),
  ).toBe(values.length === 0 ? "0 = 1" : "`target`.`id` IN (0, 3)");
});
test.each([undefined, 0, 9, -5])(
  "date ranges preserve the specified hour %s",
  (hour) => {
    const getDayRangeQExpr = jest.fn((_date: Date, _hour?: number) => [
      qe.value("start"),
      qe.value("end"),
    ]);
    const relation = setup(
      [C.rel.between(C.value.parent("id"), C.range.today(hour))],
      { getDayRangeQExpr },
    ).children.parents;
    relation.condition({ childTableAlias: "target" });
    expect(getDayRangeQExpr.mock.calls[0][1]).toBe(hour);
  },
);
test("custom conditions receive runtime arguments and include declared source dependencies", () => {
  const customScope = jest.fn(() => qe.eq(qe.value(1), qe.value(1)));
  const relation = setup([C.custom("customScope", ["id"], ["optionalValue"])], {
    customScope,
  }).children.parents;
  const arg = { parent: { optionalValue: 0 }, context: { tenant: 1 } };
  relation.condition(arg);
  expect(customScope).toHaveBeenCalledWith(arg);
  expect(relation.requiredColumns).toEqual(["optional_value"]);
});
