import { QExpr as q } from "../../factory.js";
import { type Query, QueryNodeKind } from "../query.js";
import { Sql } from "./nodeToSql.js";
import { queryToSql } from "./queryToSql.js";

const field = q.field("u", "id");
const sql = (expr: Parameters<typeof Sql.booleanValue>[0]) =>
  Sql.booleanValue(expr).replace(/\s+/g, " ");
const base = (): Query => ({
  select: [field],
  from: q.table("users", [], "u"),
});

test.each([
  ["eq", "="],
  ["neq", "<>"],
  ["gt", ">"],
  ["gte", ">="],
  ["lt", "<"],
  ["lte", "<="],
] as const)("renders %s comparisons and escapes values", (method, operator) => {
  expect(sql(q[method](field, q.value("O'Reilly")))).toBe(
    "`u`.`id` " + operator + " 'O\\'Reilly'",
  );
});

test.each([
  ["contains", "LIKE", "%Ada%"],
  ["notContains", "NOT LIKE", "%Ada%"],
  ["startsWith", "LIKE", "Ada%"],
  ["notStartsWith", "NOT LIKE", "Ada%"],
  ["endsWith", "LIKE", "%Ada"],
  ["notEndsWith", "NOT LIKE", "%Ada"],
] as const)(
  "renders %s with the correct wildcard placement",
  (method, operator, value) => {
    expect(sql(q[method](field, "Ada"))).toBe(
      "`u`.`id` " + operator + " '" + value + "'",
    );
  },
);

test("handles empty and compound conditions", () => {
  const eq = q.eq(field, q.value(1));
  expect(sql(q.and(undefined, null))).toBe("1 = 1");
  expect(q.or(undefined, eq)).toBe(eq);
  expect(sql(q.paren(q.and(eq, q.isNotNull(field))))).toBe(
    "(`u`.`id` = 1 AND `u`.`id` IS NOT NULL)",
  );
  expect(sql(q.or(eq, q.isNull(field)))).toBe(
    "`u`.`id` = 1 OR `u`.`id` IS NULL",
  );
});

test("renders ranges, value lists, and subqueries", () => {
  expect(sql(q.between(field, q.value(1), q.value(3)))).toBe(
    "`u`.`id` BETWEEN 1 AND 3",
  );
  expect(sql(q.in(field, [1, 2]))).toBe("`u`.`id` IN (1, 2)");
  expect(sql(q.in(field, []))).toBe("0 = 1");
  expect(sql(q.notIn(field, [1]))).toBe("`u`.`id` NOT IN (1)");
  expect(sql(q.in(field, q.raw("SELECT id FROM archived")))).toContain(
    "IN (SELECT id FROM archived)",
  );
  expect(sql(q.exists(base()))).toBe(
    "EXISTS (SELECT `u`.`id` FROM `users` AS `u`)",
  );
});

test("renders simpleWhere with explicit operators", () => {
  expect(sql(q.simpleWhere("u", { active: true, age: [">=", 18] }))).toBe(
    "`u`.`active` = true AND `u`.`age` >= 18",
  );
  expect(sql(q.simpleWhere("u", { id: 1, age: 2 }, true))).toContain(" OR ");
});

test("escapes identifiers and select aliases", () => {
  expect(Sql.select(q.field("u", "odd`name", "label"))).toBe(
    "`u`.`odd``name` AS `label`",
  );
  expect(Sql.select(q.ident("name"))).toBe("`name`");
  expect(Sql.select(q.raw("COUNT(*)"))).toBe("COUNT(*)");
  expect(Sql.select(q.field("u", "id", "id"))).toBe("`u`.`id`");
});

test("renders joins with whitespace between the table and JOIN", () => {
  const query = base();
  query.from.joins.push(
    q.join(
      q.table("posts", [], "p"),
      q.eq(field, q.field("p", "userId")),
      "LEFT",
    ),
  );
  expect(queryToSql(query).replace(/\s+/g, " ")).toBe(
    "SELECT `u`.`id` FROM `users` AS `u` LEFT JOIN `posts` AS `p` ON `u`.`id` = `p`.`userId`",
  );
});

test("renders grouping, having, sorting, pagination and locks", () => {
  const query = {
    ...base(),
    groupBy: { kind: QueryNodeKind.GroupBy as const, cols: [field] },
    having: q.gt(q.fn("COUNT", [field]), q.value(1)),
    sort: [q.sort(field, "DESC")],
    limit: 10,
    offset: 20,
    lock: "FOR UPDATE" as const,
  };
  expect(queryToSql(query).replace(/\s+/g, " ")).toBe(
    "SELECT `u`.`id` FROM `users` AS `u` GROUP BY `u`.`id` HAVING COUNT(`u`.`id`) > 1 ORDER BY `u`.`id` DESC LIMIT 10 OFFSET 20 FOR UPDATE",
  );
  expect(queryToSql({ ...base(), lock: "FOR SHARE" })).toContain(" FOR SHARE");
  expect(() => queryToSql({ ...base(), offset: 1 })).toThrow(
    "LIMIT is required",
  );
});

test("renders a subquery table and window frame boundaries", () => {
  expect(Sql.table(q.subQueryTable(base(), [], "result"))).toBe(
    "(SELECT `u`.`id` FROM `users` AS `u`) AS `result`",
  );
  const fn = {
    ...q.fn("SUM", [field], "total"),
    over: {
      kind: QueryNodeKind.Over as const,
      partitionBy: [q.ident("team")],
      orderBy: [q.sort(field, "ASC")],
      window: q.windowBetween(
        "ROWS",
        { type: "PRECEDING", value: 2 },
        { type: "CURRENT ROW" },
      ),
    },
  };
  expect(Sql.fn(fn)).toBe(
    "SUM(`u`.`id`)OVER (PARTITION BY `team` ORDER BY `u`.`id` ASC ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS total",
  );
  expect(
    Sql.fn({
      ...q.fn("SUM", [field]),
      over: {
        kind: QueryNodeKind.Over,
        window: q.window("ROWS", { type: "UNBOUNDED PRECEDING" }),
      },
    }),
  ).toContain("ROWS UNBOUNDED PRECEDING");
});

test("preserves nested AND/OR grouping on either side", () => {
  const a = q.eq(q.field("u", "tenant"), q.value(1));
  const b = q.eq(q.field("u", "active"), q.value(true));
  const c = q.eq(q.field("u", "public"), q.value(true));
  expect(sql(q.and(a, q.or(b, c)))).toBe(
    "`u`.`tenant` = 1 AND (`u`.`active` = true OR `u`.`public` = true)",
  );
  expect(sql(q.and(q.or(a, b), c))).toBe(
    "(`u`.`tenant` = 1 OR `u`.`active` = true) AND `u`.`public` = true",
  );
  expect(sql(q.or(q.and(a, b), c))).toBe(
    "(`u`.`tenant` = 1 AND `u`.`active` = true) OR `u`.`public` = true",
  );
});

test("keeps a zero limit, including with an offset", () => {
  expect(queryToSql({ ...base(), limit: 0 })).toBe(
    "SELECT `u`.`id` FROM `users` AS `u` LIMIT 0",
  );
  expect(queryToSql({ ...base(), limit: 0, offset: 2 })).toContain(
    "LIMIT 0 OFFSET 2",
  );
  expect(queryToSql({ ...base(), offset: 0 })).not.toContain("OFFSET");
  expect(queryToSql(base())).not.toContain("LIMIT");
});

test.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  "rejects invalid pagination value %s",
  (value) => {
    expect(() => queryToSql({ ...base(), limit: value })).toThrow(
      "LIMIT must be a non-negative safe integer",
    );
    expect(() => queryToSql({ ...base(), limit: 10, offset: value })).toThrow(
      "OFFSET must be a non-negative safe integer",
    );
  },
);
