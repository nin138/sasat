import { createSqlGenerator } from "../../../../db/sqlGenerator.js";
import { QExpr as q } from "../../factory.js";
import { type Query, QueryNodeKind } from "../query.js";

const base = (value: string | number = 1): Query => ({
  select: [q.field("u", "id")],
  from: q.table("users", [], "u"),
  where: q.eq(q.field("u", "id"), q.value(value)),
});

for (const dialect of ["mysql", "postgres"] as const) {
  const sql = createSqlGenerator(dialect);
  const placeholder = (i: number) => (dialect === "mysql" ? "?" : `$${i}`);
  test(`${dialect} binds in SQL occurrence order across FROM, JOIN, and predicate subqueries`, () => {
    const query: Query = {
      select: [q.fn("COALESCE", [q.field("src", "id"), q.value("select")])],
      from: q.subQueryTable(base("from"), [], "src"),
      join: [
        q.join(
          q.subQueryTable(base("join-from"), [], "j"),
          q.eq(q.field("j", "id"), q.value("join-on")),
          "INNER",
        ),
      ],
      where: q.and(
        q.eq(q.field("src", "id"), q.value("where")),
        q.exists(base("exists")),
        q.in(q.field("src", "id"), base("in-query")),
      ),
      groupBy: { kind: QueryNodeKind.GroupBy, cols: [q.field("src", "id")] },
      having: q.gt(q.fn("COUNT", [q.field("src", "id")]), q.value(7)),
      sort: [q.sort(q.fn("COALESCE", [q.field("src", "id"), q.value("sort")]))],
      limit: 2,
      offset: 3,
    };
    const result = sql.compileQuery(query);
    expect(result.values).toEqual([
      "select",
      "from",
      "join-from",
      "join-on",
      "where",
      "exists",
      "in-query",
      7,
      "sort",
      "2",
      "3",
    ]);
    expect(result.text).toContain(
      `LIMIT ${placeholder(10)} OFFSET ${placeholder(11)}`,
    );
    if (dialect === "postgres")
      expect(result.text.match(/\$\d+/g)).toEqual(
        result.values.map((_, i) => `$${i + 1}`),
      );
    else expect(result.text.match(/\?/g)).toHaveLength(result.values.length);
    expect(result.text).not.toContain("'where'");
    // String rendering remains independent of any preceding compile operation.
    expect(sql.query(base("legacy"))).toContain("'legacy'");
  });

  test(`${dialect} preserves literal precision, NULL and LIKE patterns without interpolation`, () => {
    const field = q.field("u", "id");
    const dangerous = "'\\文字 ? $1; --";
    const result = sql.compileQuery({
      ...base(),
      where: q.and(
        q.eq(field, q.value(dangerous)),
        q.between(
          field,
          q.value(-9223372036854775808n),
          q.value(9223372036854775807n),
        ),
        q.in(field, [0, 9007199254740993n]),
        q.eq(field, q.value("0.123456789012345678")),
        q.eq(field, q.value(null)),
        q.eq(field, q.value(false)),
        q.isNull(field),
        q.or(q.contains(field, "a%b_"), q.notContains(field, "x")),
        q.startsWith(field, "start"),
        q.endsWith(field, "end"),
      ),
    });
    expect(result.values).toEqual([
      dangerous,
      "-9223372036854775808",
      "9223372036854775807",
      0,
      "9007199254740993",
      "0.123456789012345678",
      null,
      false,
      "%a%b_%",
      "%x%",
      "start%",
      "%end",
    ]);
    expect(result.text).not.toContain(dangerous);
    expect(result.text).toContain("IS NULL");
    expect(result.text).toContain("NOT LIKE");
    expect(result.text).toContain(dialect === "postgres" ? '("u"' : "(`u`");
  });

  test(`${dialect} renders empty IN and NOT IN as false and true without unused binds`, () => {
    for (const operator of ["IN", "NOT IN"] as const) {
      const query: Query = {
        ...base(),
        where: {
          kind: QueryNodeKind.InExpr,
          left: q.value("unused"),
          operator,
          right: [],
        },
      };
      const expression = operator === "IN" ? "0 = 1" : "1 = 1";
      expect(sql.compileQuery(query)).toEqual({
        text: expect.stringContaining(`WHERE ${expression}`),
        values: [],
      });
      expect(sql.query(query)).toContain(`WHERE ${expression}`);
    }
  });

  test(`${dialect} validates pagination before returning a statement`, () => {
    for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => sql.compileQuery({ ...base(), limit: value })).toThrow(
        "LIMIT must be",
      );
      expect(() =>
        sql.compileQuery({ ...base(), limit: 1, offset: value }),
      ).toThrow("OFFSET must be");
    }
    expect(() => sql.compileQuery({ ...base(), offset: 1 })).toThrow(
      "LIMIT is required",
    );
    expect(sql.compileQuery({ ...base(), limit: 0, offset: 0 }).values).toEqual(
      [1, "0"],
    );
    expect(
      sql.compileQuery({ ...base(), limit: Number.MAX_SAFE_INTEGER }).values,
    ).toEqual([1, String(Number.MAX_SAFE_INTEGER)]);
  });

  test(`${dialect} keeps trusted raw expressions and escaped identifiers separate from binds`, () => {
    const result = sql.compileQuery({
      select: [q.raw("CURRENT_TIMESTAMP AS now")],
      from: q.table("odd'name", [], "u"),
      where: q.and(q.raw("1 = 1"), q.eq(q.field("u", "id"), q.value("value"))),
    });
    expect(result.text).toContain("CURRENT_TIMESTAMP AS now");
    expect(result.text).toContain(sql.escapeId("odd'name"));
    expect(result.text).toContain("WHERE 1 = 1 AND");
    expect(result.values).toEqual(["value"]);
  });

  test(`${dialect} keeps bind contexts independent across concurrent compiles and errors`, async () => {
    const before = sql.query(base(1));
    const compiled = await Promise.all(
      Array.from({ length: 20 }, (_, value) =>
        Promise.resolve().then(() => sql.compileQuery(base(value))),
      ),
    );
    compiled.forEach((statement, value) => {
      expect(statement.values).toEqual([value]);
      expect(statement.text).toContain(placeholder(1));
    });
    expect(() =>
      sql.compileQuery({
        ...base(),
        where: q.eq(q.field("u", "id"), q.value(undefined as never)),
      }),
    ).toThrow("parameter at index 0");
    expect(sql.compileQuery(base(42)).values).toEqual([42]);
    expect(sql.query(base(1))).toBe(before);
    expect(Object.isFrozen(sql)).toBe(true);
  });
}

test("PostgreSQL preserves numeric literal comparison and function types and supports explicit casts", () => {
  const sql = createSqlGenerator("postgres");
  const query = {
    ...base(),
    select: [
      q.fn("COALESCE", [q.value(1), q.value(0)]),
      q.fn("CONCAT", [q.value("text"), q.value(null)]),
      q.fn("ABS", [q.cast(q.value("-1.25"), "DECIMAL(10,2)")]),
    ],
    where: q.gt(q.value(10), q.value(2)),
  };
  const result = sql.compileQuery(query);
  expect(result.text).toContain("COALESCE($1::integer,$2::integer)");
  expect(result.text).toContain("CONCAT($3::text,$4::text)");
  expect(result.text).toContain("ABS(CAST($5 AS DECIMAL(10,2)))");
  expect(result.text).toContain("WHERE $6::integer  > $7::integer");
  expect(result.values).toEqual([1, 0, "text", null, "-1.25", 10, 2]);
});

test("MySQL restores integer and decimal literal types for parameter comparisons and function results", () => {
  const sql = createSqlGenerator("mysql");
  const result = sql.compileQuery({
    ...base(),
    select: [
      q.fn("COALESCE", [q.value(1), q.value(0)]),
      q.fn("ABS", [q.value(-1.25)]),
      q.fn("ABS", [q.value(18446744073709551615n)]),
    ],
    where: q.gt(q.value(10n), q.value(2n)),
  });
  expect(result.text).toContain(
    "COALESCE(CAST(? AS SIGNED),CAST(? AS SIGNED))",
  );
  expect(result.text).toContain("ABS(CAST(? AS DECIMAL(3,2)))");
  expect(result.text).toContain("ABS(CAST(? AS UNSIGNED))");
  expect(result.text).toContain("WHERE CAST(? AS SIGNED)  > CAST(? AS SIGNED)");
  expect(result.values).toEqual([
    1,
    0,
    -1.25,
    "18446744073709551615",
    "10",
    "2",
  ]);
});
