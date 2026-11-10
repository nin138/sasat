import { test } from "node:test";
import { verifyRelationColumnMapping } from "./relation-column-mapping-cases.js";

test(
  "MySQL generated relations retain table-specific column mappings in joins and paging",
  { timeout: 30000 },
  () => verifyRelationColumnMapping("mysql"),
);
