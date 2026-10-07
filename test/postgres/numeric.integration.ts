import { test } from "node:test";
import { verifyNumericDatabase } from "../integration/numeric-cases.js";

test(
  "PostgreSQL generated Decimal/BigInt APIs preserve precision and native types",
  { timeout: 60000 },
  () => verifyNumericDatabase("postgres"),
);
