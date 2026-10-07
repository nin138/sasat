import { test } from "node:test";
import { verifyHashIds } from "../integration/hash-id-cases.js";

test(
  "PostgreSQL generated Hash IDs preserve zero, nullable references and input validation",
  { timeout: 60000 },
  () => verifyHashIds("postgres"),
);
