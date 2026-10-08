import { test } from "node:test";
import { verifyPooledTransactions } from "../integration/pool-transaction-cases.js";

test(
  "PostgreSQL transactions share bounded pool capacity and discard unsafe sessions",
  { timeout: 60000 },
  () => verifyPooledTransactions("postgres"),
);
