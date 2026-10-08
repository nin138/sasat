/** The driver capabilities used by Sasat; importing these types loads no driver. */
export type MysqlDriver = Pick<
  typeof import("mysql2/promise"),
  "createConnection" | "createPool"
>;
export type PostgresDriver = Pick<typeof import("pg"), "Pool" | "types">;

export type DatabaseDriver =
  | { readonly dialect: "mysql"; readonly driver: MysqlDriver }
  | { readonly dialect: "postgres"; readonly driver: PostgresDriver };
