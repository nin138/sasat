/** Preserve exact driver IDs; reject numbers that have already lost precision. */
export function normalizeInsertId(value: unknown): number | bigint {
  if (value == null) return 0;
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    const integer = BigInt(value);
    const number = Number(integer);
    return Number.isSafeInteger(number) ? number : integer;
  }
  throw new Error("Inserted ID must be an exact integer");
}
