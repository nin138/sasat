import assert from "node:assert/strict";
import type { DBClient } from "../../src/db/connectors/dbClient.js";
import { QExpr as q } from "../../src/runtime/dsl/factory.js";
import {
  type Query,
  QueryNodeKind,
} from "../../src/runtime/dsl/query/query.js";

/** Runs against the isolated database populated by verifyPreparedStatements. */
export async function verifyCompiledQueries(client: DBClient) {
  const field = (name: string) => q.field("s", name);
  const base: Query = {
    select: [field("id"), field("amount"), field("label")],
    from: q.table("samples", [], "s"),
  };
  const idQuery: Query = {
    select: [field("id")],
    from: base.from,
    where: q.in(field("id"), [0n, 9007199254740993n]),
  };
  const queries: Query[] = [
    {
      ...base,
      where: q.and(
        q.between(field("id"), q.value(0n), q.value(9223372036854775807n)),
        q.contains(field("label"), "日本語"),
        q.isNull(field("optional")),
      ),
      sort: [q.sort(field("id"))],
      limit: 2,
      offset: 1,
    },
    {
      ...base,
      where: q.or(
        q.eq(field("label"), q.value("x' OR 1=1 --")),
        q.eq(field("id"), q.value(9007199254740993n)),
      ),
    },
    { ...base, where: q.in(field("id"), []) },
    { ...base, where: q.notIn(field("id"), []) },
    {
      ...base,
      where: q.and(
        q.in(field("id"), idQuery),
        q.exists({ ...idQuery, where: q.eq(field("id"), q.value(0n)) }),
      ),
    },
    {
      select: [
        q.field("page", "id"),
        q.fn(
          "COALESCE",
          [q.field("page", "label"), q.value("fallback")],
          "label",
        ),
      ],
      from: q.subQueryTable(
        {
          ...base,
          where: q.gte(field("id"), q.value(0n)),
          sort: [q.sort(field("id"))],
          limit: 3,
          offset: 1,
        },
        [],
        "page",
      ),
      join: [
        q.join(
          q.subQueryTable(
            { ...base, where: q.gt(field("id"), q.value(0n)) },
            [],
            "match",
          ),
          q.and(
            q.eq(q.field("page", "id"), q.field("match", "id")),
            q.contains(q.field("match", "label"), "文字"),
          ),
          "LEFT",
        ),
      ],
      where: q.lt(q.field("page", "id"), q.value(9223372036854775807n)),
      sort: [q.sort(q.field("page", "id"))],
    },
    {
      select: [field("flag"), q.fn("COUNT", [field("id")], "total")],
      from: base.from,
      groupBy: { kind: QueryNodeKind.GroupBy, cols: [field("flag")] },
      having: q.gt(q.fn("COUNT", [field("id")]), q.value(2)),
      limit: 1,
    },
    {
      ...base,
      select: [
        q.fn("COUNT", [q.value(1)], "total"),
        q.fn("COUNT", [q.value(null)], "empty_count"),
      ],
    },
    {
      ...base,
      select: [
        q.fn("COALESCE", [q.value(1), q.value(0)], "constant"),
        q.fn("CONCAT", [q.value("日本語"), q.value("'\\")], "text_value"),
        q.fn("ABS", [q.cast(q.value("-1.25"), "DECIMAL(10,2)")], "amount"),
      ],
      where: q.gt(q.value(10), q.value(2)),
      limit: 1,
    },
    {
      ...base,
      select: [
        {
          ...q.fn("SUM", [field("amount")], "running"),
          over: {
            kind: QueryNodeKind.Over,
            orderBy: [q.sort(field("id"))],
            window: q.windowBetween(
              "ROWS",
              { type: "PRECEDING", value: 1 },
              { type: "CURRENT ROW" },
            ),
          },
        },
      ],
      sort: [q.sort(field("id"))],
      limit: 3,
    },
    { ...base, limit: 0, offset: 1 },
    {
      ...base,
      where: q.eq(field("flag"), q.value(false)),
      sort: [q.sort(field("id"))],
      limit: 1,
    },
  ];
  for (const [index, query] of queries.entries()) {
    const expected = await client.rawQuery(client.sql.query(query));
    const statement = client.sql.compileQuery(query);
    const actual = await client.executeQuery(statement);
    // mysql2 row prototypes differ between protocols; compare ordinary records.
    assert.deepEqual(
      actual.map((row) => ({ ...row })),
      expected.map((row) => ({ ...row })),
      `compiled query ${index} differs from string query`,
    );
  }
}
