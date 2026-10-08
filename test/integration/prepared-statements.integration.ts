import { test } from "node:test";
import { verifyPreparedStatements } from "./prepared-statement-cases.js";

for (const kind of ["mysql", "mysql-pool"] as const)
  test(
    `${kind} binds values, preserves types, and handles transaction failures`,
    { timeout: 60000 },
    () => verifyPreparedStatements(kind),
  );
