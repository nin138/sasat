import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { VirtualRelation } from "../../migration/data/virtualRelation.js";
import { DataStoreHandler } from "../../migration/dataStore.js";
import { StoreMigrator } from "../../migration/front/storeMigrator.js";
import { Conditions as C } from "../../migration/makeCondition.js";
import { QExpr } from "../../runtime/dsl/factory.js";
import { Sql } from "../../runtime/dsl/query/sql/nodeToSql.js";
import { makeJoinConditionValue } from "../codegen/ts/relationMap/makeJoinConditionValue.js";
import { EntityNode } from "./entityNode.js";
import type { JoinConditionNode } from "./JoinConditionNode.js";

function setup(
  conditions: JoinConditionNode[],
  options: Partial<VirtualRelation> = {},
  enabled = true,
) {
  const store = StoreMigrator.deserialize({ tables: [] });
  for (const name of ["parents", "children"])
    store.createTable(name, (table) => {
      table.column("id").int().primary();
      if (enabled || name === "parents") table.enableGQL();
    });
  const ds = new DataStoreHandler(store.serialize());
  ds.table("children").addVirtualRelation({
    parentTable: "parents",
    parentFieldName: "children",
    childFieldName: "parents",
    conditions,
    ...options,
  });
  return {
    parent: new EntityNode(ds, ds.table("parents")),
    child: new EntityNode(ds, ds.table("children")),
  };
}

test.each(["=", "<>", ">", "<", ">=", "<="] as const)(
  "reverse relation preserves the meaning of %s",
  (operator) => {
    const condition = C.rel.comparison(
      C.value.parent("lower"),
      operator,
      C.value.child("upper"),
    );
    const original = structuredClone(condition);
    const { parent, child } = setup([condition]);
    expect(child.references[0].joinCondition).toEqual([original]);
    expect(parent.referencedBy[0].joinCondition).toEqual([
      C.rel.comparison(
        C.value.child("lower"),
        operator,
        C.value.parent("upper"),
      ),
    ]);
    expect(condition).toEqual(original);
    const execute = (
      node: EntityNode,
      relation: Parameters<typeof makeJoinConditionValue>[1],
      parentTableAlias: string,
      childTableAlias: string,
    ) => {
      const source = `const generated = ({${makeJoinConditionValue(node, relation)}}).condition; generated`;
      const fn = runInNewContext(
        ts.transpileModule(source, {
          compilerOptions: { target: ts.ScriptTarget.ES2022 },
        }).outputText,
        { qe: QExpr },
      );
      return Sql.booleanValue(
        fn({ parentTableAlias, childTableAlias }),
      ).replace(/\s+/g, " ");
    };
    const forward = execute(child, child.references[0], "children", "parents");
    const backward = execute(
      parent,
      parent.referencedBy[0],
      "parents",
      "children",
    );
    expect(forward).toBe(
      `\`parents\`.\`lower\` ${operator} \`children\`.\`upper\``,
    );
    expect(backward).toBe(forward);
  },
);

test("reverse relation preserves constants, context and date expressions", () => {
  const values = [
    C.value.fixed(0),
    C.value.contextOrDefault("tenant", 0),
    C.value.contextOrError("tenant", "required"),
    C.value.today(4),
    C.value.now(),
  ];
  const conditions = values.map((value) =>
    C.rel.comparison(C.value.child("id"), ">", value),
  );
  expect(setup(conditions).parent.referencedBy[0].joinCondition).toEqual(
    values.map((value) => C.rel.comparison(C.value.parent("id"), ">", value)),
  );
});

test("reverse relation handles null, IN, ranges, date ranges and custom required fields", () => {
  const conditions = [
    C.rel.isNull(C.value.parent("optional")),
    C.rel.isNotNull(C.value.child("required")),
    C.rel.in(C.value.parent("id"), [C.value.child("id"), C.value.fixed(0)]),
    C.rel.between(
      C.value.child("date"),
      C.range.values(C.value.parent("start"), C.value.parent("end")),
    ),
    C.rel.between(C.value.child("date"), C.range.today(4)),
    C.custom("tenantScope", ["tenant"], ["owner"]),
  ];
  expect(setup(conditions).parent.referencedBy[0].joinCondition).toEqual([
    C.rel.isNull(C.value.child("optional")),
    C.rel.isNotNull(C.value.parent("required")),
    C.rel.in(C.value.child("id"), [C.value.parent("id"), C.value.fixed(0)]),
    C.rel.between(
      C.value.parent("date"),
      C.range.values(C.value.child("start"), C.value.child("end")),
    ),
    C.rel.between(C.value.parent("date"), C.range.today(4)),
    C.custom("tenantScope", ["owner"], ["tenant"]),
  ]);
});

test.each([undefined, "array", "nullable", "notnull"] as const)(
  "virtual relation cardinality %s is respected in both directions",
  (type) => {
    const { parent, child } = setup([], { parentType: type, childType: type });
    for (const node of [parent.referencedBy[0], child.references[0]])
      expect(node).toMatchObject({
        isArray: type === undefined || type === "array",
        isNullable: type === "nullable",
        isPrimary: false,
        isGQLOpen: true,
      });
  },
);
test("unnamed virtual sides are omitted and closed entities hide both sides", () => {
  const unnamed = setup([], {
    parentFieldName: undefined,
    childFieldName: undefined,
  });
  expect(unnamed.parent.referencedBy).toEqual([]);
  expect(unnamed.child.references).toEqual([]);
  const closed = setup([], {}, false);
  expect(closed.parent.referencedBy[0].isGQLOpen).toBe(false);
  expect(closed.child.references[0].isGQLOpen).toBe(false);
});
