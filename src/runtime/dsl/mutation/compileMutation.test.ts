import { createSqlGenerator } from "../../../db/sqlGenerator.js";
import { QExpr as q } from "../factory.js";
import type { Create } from "./mutation.js";

const tables = {
  users: {
    identifiableKeys: ["user_id"],
    identifiableFields: ["id"],
    columnMap: {
      id: "user_id",
      name: "display_name",
      amount: "amount",
      optional: "optional",
    },
  },
};

for (const dialect of ["mysql", "postgres"] as const) {
  const sql = createSqlGenerator(dialect);
  const id = sql.escapeId;
  const base: Create = {
    table: "users",
    fields: ["id", "name", "amount", "optional"],
    entities: [
      [
        9007199254740993n,
        "O'Reilly\\日本語",
        "0.123456789012345678",
        undefined,
      ],
      [2, null, undefined, null],
    ],
  };

  test(`${dialect} compiles bulk inserts with mapped columns, exact values and DEFAULT slots`, () => {
    const statement = sql.compileCreate(base, tables);
    expect(statement.text).toContain(
      ["user_id", "display_name", "amount", "optional"].map(id).join(","),
    );
    expect(statement.text.match(/DEFAULT/g)).toHaveLength(2);
    expect(statement.text).not.toContain("O'Reilly");
    expect(statement.values).toEqual([
      "9007199254740993",
      "O'Reilly\\日本語",
      "0.123456789012345678",
      2,
      null,
      null,
    ]);
    if (dialect === "postgres")
      expect(statement.text.match(/\$\d+/g)).toEqual([
        "$1",
        "$2",
        "$3",
        "$4",
        "$5",
        "$6",
      ]);
    else expect(statement.text.match(/\?/g)).toHaveLength(6);
    expect(sql.create(base, tables)).toContain("0.123456789012345678");
  });

  test(`${dialect} retains ignore, upsert keys and returning without adding bind values`, () => {
    const statement = sql.compileCreate(
      {
        ...base,
        ignore: true,
        upsert: ["display_name"],
        conflictColumns: ["user_id"],
        returning: "user_id",
      },
      tables,
    );
    expect(statement.values).toEqual(sql.compileCreate(base, tables).values);
    if (dialect === "postgres") {
      expect(statement.text).toContain(
        'ON CONFLICT ("user_id") DO UPDATE SET "display_name" = EXCLUDED."display_name"',
      );
      expect(statement.text).toContain(
        'RETURNING "user_id" AS "__sasat_insert_id"',
      );
      expect(
        sql.compileCreate({ ...base, ignore: true }, tables).text,
      ).toContain("ON CONFLICT DO NOTHING");
    } else {
      expect(statement.text).toContain("INSERT IGNORE");
      expect(statement.text).toContain(
        "ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`)",
      );
    }
  });

  test(`${dialect} supports default-only single/bulk inserts and rejects empty batches`, () => {
    for (const entities of [[[]], [[], []]]) {
      const result = sql.compileCreate(
        { table: "users", fields: [], entities },
        tables,
      );
      expect(result.values).toEqual([]);
      if (dialect === "postgres")
        expect(result.text).toContain(
          entities.length === 1
            ? "DEFAULT VALUES"
            : '("user_id") VALUES (DEFAULT),(DEFAULT)',
        );
      else
        expect(result.text).toContain(
          entities.length === 1 ? "VALUES ()" : "VALUES (),()",
        );
    }
    expect(() => sql.compileCreate({ ...base, entities: [] }, tables)).toThrow(
      "at least one row",
    );
  });

  test(`${dialect} numbers SET values before WHERE and nested predicate queries`, () => {
    const subquery = {
      select: [q.field("p", "user_id")],
      from: q.subQueryTable(
        {
          select: [q.field("u", "user_id")],
          from: q.table("users", [], "u"),
          where: q.eq(q.field("u", "display_name"), q.value("inner")),
        },
        [],
        "p",
      ),
      where: q.gt(q.field("p", "user_id"), q.value(0)),
    };
    const where = q.and(
      q.eq(q.field("users", "user_id"), q.value(5)),
      q.in(q.field("users", "user_id"), subquery),
      q.notIn(q.field("users", "user_id"), []),
    );
    const update = sql.compileUpdate(
      {
        table: "users",
        values: [
          { field: "name", value: "new'\\value" },
          { field: "optional", value: null },
        ],
        where,
      },
      tables,
    );
    expect(update.text).toContain(`SET ${id("display_name")} = `);
    expect(update.values).toEqual(["new'\\value", null, 5, "inner", 0]);
    expect(update.text).not.toContain("new'");
    if (dialect === "postgres")
      expect(update.text.match(/\$\d+/g)).toEqual([
        "$1",
        "$2",
        "$3",
        "$4",
        "$5",
      ]);
    const deleted = sql.compileDelete({ table: "users", where });
    expect(deleted.values).toEqual([5, "inner", 0]);
    expect(deleted.text).toContain("AND 1 = 1");
    expect(deleted.text).not.toContain("SET");
  });

  test(`${dialect} preserves tenant grouping and nullable predicates`, () => {
    const where = q.and(
      q.eq(q.field("users", "tenant_id"), q.value(42)),
      q.or(
        q.isNull(q.field("users", "optional")),
        q.eq(q.field("users", "optional"), q.value(0)),
      ),
    );
    const result = sql.compileDelete({ table: "users", where });
    expect(result.values).toEqual([42, 0]);
    expect(result.text).toContain(
      `AND (${id("users")}.${id("optional")} IS NULL OR`,
    );
  });

  test(`${dialect} concurrent mutations and failed compiles do not share bind state`, async () => {
    const statements = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() =>
          sql.compileCreate(
            { table: "users", fields: ["name"], entities: [[`row-${i}`]] },
            tables,
          ),
        ),
      ),
    );
    statements.forEach((statement, i) =>
      expect(statement.values).toEqual([`row-${i}`]),
    );
    expect(() =>
      sql.compileUpdate(
        {
          table: "users",
          values: [{ field: "name", value: undefined as never }],
          where: q.raw("1 = 0"),
        },
        tables,
      ),
    ).toThrow("Invalid SQL parameter at index 0");
    expect(
      sql.compileDelete({
        table: "users",
        where: q.eq(q.field("users", "user_id"), q.value(1)),
      }).values,
    ).toEqual([1]);
    expect(Object.isFrozen(sql)).toBe(true);
  });
}
