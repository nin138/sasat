import { test } from "node:test";
import { verifyPreparedStatements } from "../integration/prepared-statement-cases.js";

test(
  "PostgreSQL binds values, preserves types, and handles transaction failures",
  { timeout: 60000 },
  () => verifyPreparedStatements("postgres"),
);
