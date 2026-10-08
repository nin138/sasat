import { test } from "node:test";
import {
  verifyManagedDeadlock,
  verifyManagedLockTimeout,
  verifyManagedTransactions,
} from "./managed-transaction-cases.js";

test(
  "MySQL managed transactions commit, roll back, and isolate discarded sessions",
  { timeout: 60000 },
  () => verifyManagedTransactions("mysql"),
);
test(
  "MySQL managed transactions stop queued writes after a real deadlock",
  { timeout: 30000 },
  () => verifyManagedDeadlock("mysql"),
);
test(
  "MySQL managed transactions roll back earlier writes after a swallowed lock timeout",
  { timeout: 30000 },
  () => verifyManagedLockTimeout("mysql"),
);
