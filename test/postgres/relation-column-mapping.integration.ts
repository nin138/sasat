import { test } from "node:test";
import { verifyRelationColumnMapping } from "../integration/relation-column-mapping-cases.js";

test(
  "PostgreSQL generated relations retain table-specific column mappings in joins and paging",
  { timeout: 30000 },
  () => verifyRelationColumnMapping("postgres"),
);
