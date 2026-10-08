import { test } from "node:test";
import {
  verifyManagedDeadlock,
  verifyManagedLockTimeout,
  verifyManagedTransactions,
} from "../integration/managed-transaction-cases.js";

test(
  "PostgreSQL managed transactions commit, roll back, and isolate discarded sessions",
  { timeout: 60000 },
  () => verifyManagedTransactions("postgres"),
);
test(
  "PostgreSQL managed transactions stop queued writes after a real deadlock",
  { timeout: 30000 },
  () => verifyManagedDeadlock("postgres"),
);
test(
  "PostgreSQL managed transactions roll back earlier writes after a swallowed lock timeout",
  { timeout: 30000 },
  () => verifyManagedLockTimeout("postgres"),
);
