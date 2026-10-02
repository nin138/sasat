import ts from "typescript";
import { config } from "../config/config.js";
import { tsg } from "./factory.js";
import { TsFile } from "./file.js";
import { ImportDeclaration } from "./importDeclaration.js";
import { RawCodeStatement } from "./node/rawCodeStatement.js";
import { KeywordTypeNode as type } from "./node/type/typeKeyword.js";
import { tsValueString } from "./tsValueString.js";

test("combines imports from nested expressions without duplicates", async () => {
  const first = tsg.identifier("User").importFrom("./entities");
  const second = tsg.identifier("User").importFrom("./entities");
  const file = new TsFile(
    tsg.variable(
      "const",
      "users",
      tsg.array([tsg.new(first), tsg.new(second)]),
    ),
  );
  const generated = await file.generate();
  expect(generated.match(/import /g)).toHaveLength(1);
  expect(generated).toContain("{User}");
  expect(generated).toContain("[new User(),new User()]");
  file.disableEsLint();
  expect(await file.generate()).toMatch(/^\/\* eslint-disable \*\//);
  file.enableEsLint();
  expect(await file.generate()).not.toContain("eslint-disable");
});

test("adds JS extensions only to relative imports when configured", () => {
  const original = config().generator.addJsExtToImportStatement;
  try {
    config().generator.addJsExtToImportStatement = true;
    expect(new ImportDeclaration(["User"], "./User").toString()).toContain(
      '"./User.js"',
    );
    expect(new ImportDeclaration(["User"], "sasat").toString()).toContain(
      '"sasat"',
    );
    config().generator.addJsExtToImportStatement = false;
    expect(new ImportDeclaration(["User"], "./User").toString()).toContain(
      '"./User"',
    );
  } finally {
    config().generator.addJsExtToImportStatement = original;
  }
});

test("builds a parseable interface, enum, class, and function", async () => {
  const declaration = tsg
    .interface("Named")
    .addProperty("name", type.string, true, true)
    .export();
  const status = tsg
    .enum(tsg.identifier("Status"), [
      tsg.enumMember(tsg.identifier("Ready"), tsg.string("ready")),
    ])
    .export();
  const instance = tsg
    .class("Example")
    .implements(tsg.implements(tsg.typeRef("Named")))
    .addProperty(tsg.propertyDeclaration("name", type.string, true))
    .addMethod(
      tsg.method("value", [], type.number, [
        tsg.if(
          tsg.boolean(false),
          tsg.throw(tsg.new(tsg.identifier("Error"), tsg.string("bad"))),
        ),
        tsg.return(tsg.number(42)),
      ]),
    )
    .export();
  const generated = await new TsFile(
    declaration,
    status,
    instance,
    new RawCodeStatement("export const marker = 1;"),
  ).generate();
  const result = ts.transpileModule(generated, { reportDiagnostics: true });
  expect(result.diagnostics).toEqual([]);
  expect(generated).toContain("readonly name?");
  expect(generated).toContain("return 42;");
});

test("composes expressions and generic type references", () => {
  expect(
    tsg.identifier("load").call(tsg.number(1)).typeArgs(type.string).toString(),
  ).toBe("load<string>(1)");
  expect(tsg.typeRef("User").partial().toString()).toBe("Partial<User>");
  expect(tsg.typeRef("User").pick("id", "name").toString()).toBe(
    "Pick<User,'id'|'name'>",
  );
  expect(
    tsg.ternary(tsg.boolean(true), tsg.number(1), tsg.number(0)).toString(),
  ).toBe("(true)?1:0");
  expect(
    tsg.parenthesis(tsg.binary(tsg.number(1), "+", tsg.number(2))).toString(),
  ).toBe("(1+2)");
});

test.each([
  [null, "null"],
  [undefined, "undefined"],
  [true, "true"],
  [42, "42"],
  ["O'Reilly", "'O\\'Reilly'"],
  [[1, "a"], "[1,'a']"],
  [{ key: false }, "{key: false}"],
])("serializes TypeScript literal %j", (value, expected) => {
  expect(tsValueString(value)).toBe(expected);
});
test("rejects unsupported literal values", () => {
  expect(() => tsValueString(Symbol("unsupported"))).toThrow(
    "unsupported data type symbol",
  );
});
