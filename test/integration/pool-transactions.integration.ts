import { test } from "node:test";
import { verifyPooledTransactions } from "./pool-transaction-cases.js";

test(
  "MySQL transactions share bounded pool capacity and discard unsafe sessions",
  { timeout: 60000 },
  () => verifyPooledTransactions("mysql"),
);
