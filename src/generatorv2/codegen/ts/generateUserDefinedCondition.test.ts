import { runInNewContext } from "node:vm";
import ts from "typescript";
import { DataStoreHandler } from "../../../migration/dataStore.js";
import { StoreMigrator } from "../../../migration/front/storeMigrator.js";
import { Conditions } from "../../../migration/makeCondition.js";
import { parse } from "../../parse.js";
import { generateUserDefinedCondition } from "./generateUserDefinedCondition.js";

function root(names: string[]) {
  const store = StoreMigrator.deserialize({ tables: [] });
  for (const name of ["parents", "children"])
    store.createTable(name, (table) => table.column("id").int().primary());
  const ds = new DataStoreHandler(store.serialize());
  ds.table("children").addVirtualRelation({
    parentTable: "parents",
    childFieldName: "parents",
    parentFieldName: "children",
    conditions: names.map((name) => Conditions.custom(name)),
  });
  return parse(ds);
}

test("no custom conditions leave existing user code untouched", () => {
  expect(generateUserDefinedCondition(root([]), "// user code")).toBeNull();
});
test("generates one executable stub per unique name across both relation directions", () => {
  const model = root(["tenantScope", "tenantScope", "activeScope"]);
  const code = generateUserDefinedCondition(model, "// user header\n")!;
  const exports: Record<string, () => unknown> = {};
  runInNewContext(
    ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports },
  );
  expect(Object.keys(exports)).toEqual(["tenantScope", "activeScope"]);
  expect(() => exports.tenantScope()).toThrow("TODO: Not Implemented");
  expect(code).toContain("// user header");
  expect(generateUserDefinedCondition(model, code)).toBe(code);
});
test.each(["./context", "./context.js"])(
  "preserves user implementation and existing type imports from %s",
  (contextPath) => {
    const content = `import type { GQLContext } from '${contextPath}';\nimport type { CustomCondition } from 'sasat';\nexport const tenantScope: CustomCondition<GQLContext> = () => { throw new Error('user logic'); };\n`;
    const generated = generateUserDefinedCondition(
      root(["tenantScope", "newScope"]),
      content,
    )!;
    expect(generated.startsWith(content)).toBe(true);
    expect(generated.match(/export const tenantScope/g)).toHaveLength(1);
    expect(generated.match(/export const newScope/g)).toHaveLength(1);
    expect(generated.match(/import /g)).toHaveLength(2);
  },
);

test.each([
  "export const other = () => 1, tenantScope = () => 42;",
  "export const { scope: tenantScope } = { scope: () => 42 };",
  "export const [unused, tenantScope] = [() => 1, () => 42];",
  "export const { nested: { tenantScope } } = { nested: { tenantScope: () => 42 } };",
  "export const [, tenantScope] = [() => 1, () => 42];",
  "export function tenantScope() { return 42; }",
  "const scope = () => 42; export { scope as tenantScope };",
  "export { scope as tenantScope } from './userScope.js';",
])("preserves existing custom conditions declared as %s", (content) => {
  const model = root(["tenantScope"]);
  const generated = generateUserDefinedCondition(model, content)!;
  expect(generated).not.toContain("TODO: Not Implemented");
  expect(generated).toContain(content);
  const exports: Record<string, () => number> = {};
  runInNewContext(
    ts.transpileModule(generated, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === "./userScope.js") return { scope: () => 42 };
        throw new Error(`Unexpected import: ${name}`);
      },
    },
  );
  expect(exports.tenantScope()).toBe(42);
  expect(generateUserDefinedCondition(model, generated)).toBe(generated);
});
