import { QExpr as q } from "../factory.js";
import { createToSql, deleteToSql, updateToSql } from "./mutation.js";

const tableInfo = {
  users: {
    identifiableKeys: ["user_id"],
    identifiableFields: ["id"],
    columnMap: { id: "user_id", name: "display_name" },
  },
};

test("builds escaped bulk inserts using column mappings", () => {
  expect(
    createToSql(
      {
        table: "users",
        fields: ["id", "name"],
        entities: [
          [1, "O'Reilly"],
          [2, null],
        ],
      },
      tableInfo,
    ).trim(),
  ).toBe(
    "INSERT INTO `users`(`user_id`,`display_name`) VALUES (1,'O\\'Reilly'),(2,NULL)",
  );
});

test("supports ignore and upsert", () => {
  const result = createToSql(
    {
      table: "users",
      fields: ["name"],
      entities: [["Ada"]],
      ignore: true,
      upsert: ["display_name"],
    },
    tableInfo,
  );
  expect(result).toContain("INSERT IGNORE INTO");
  expect(result).toContain(
    "ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`)",
  );
});

test("updates mapped columns and requires the provided predicate", () => {
  const where = q.eq(q.field("users", "user_id"), q.value(1));
  expect(
    updateToSql(
      { table: "users", values: [{ field: "name", value: null }], where },
      tableInfo,
    ),
  ).toBe(
    "UPDATE `users` SET `display_name` = NULL WHERE `users`.`user_id`  = 1",
  );
  expect(deleteToSql({ table: "users", where })).toBe(
    "DELETE FROM `users` WHERE `users`.`user_id`  = 1",
  );
});
