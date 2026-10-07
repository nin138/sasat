import { test } from "node:test";
import { verifyNumericDatabase, verifyNumericRedis } from "./numeric-cases.js";

test(
  "MySQL generated Decimal/BigInt APIs preserve precision and native types",
  { timeout: 60000 },
  () => verifyNumericDatabase("mysql"),
);
test(
  "Redis transports native bigint values between instances",
  { timeout: 15000 },
  verifyNumericRedis,
);
