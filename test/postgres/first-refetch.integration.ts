import { test } from "node:test";
import { verifyFirstRefetch } from "../integration/first-refetch-cases.js";

test(
  "postgres first preserves children and mutation refetch uses selections",
  { timeout: 120000 },
  () => verifyFirstRefetch("postgres"),
);
