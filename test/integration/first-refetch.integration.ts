import { test } from "node:test";
import { verifyFirstRefetch } from "./first-refetch-cases.js";

test(
  "mysql first preserves children and mutation refetch uses selections",
  { timeout: 120000 },
  () => verifyFirstRefetch("mysql"),
);
