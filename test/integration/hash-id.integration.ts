import { test } from "node:test";
import { verifyHashIds } from "./hash-id-cases.js";

test(
  "MySQL generated Hash IDs preserve zero, nullable references and input validation",
  { timeout: 60000 },
  () => verifyHashIds("mysql"),
);
