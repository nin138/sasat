import { DBColumnTypes } from "../../migration/column/columnTypes.js";
import { columnTypeToGqlPrimitive } from "./columnToGqlType.js";

describe("columnToGqlPrimitive", () => {
  it("int", () => {
    expect(columnTypeToGqlPrimitive(DBColumnTypes.int)).toBe("Int");
  });
  it("string", () => {
    expect(columnTypeToGqlPrimitive(DBColumnTypes.varchar)).toBe("String");
  });
  it("boolean", () => {
    expect(columnTypeToGqlPrimitive(DBColumnTypes.boolean)).toBe("Boolean");
  });
  it("float", () => {
    expect(columnTypeToGqlPrimitive(DBColumnTypes.double)).toBe("Float");
  });
});
