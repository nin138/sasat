import ts from "typescript";
import { getExportedVariables } from "./getExportedVariables.js";
import { isImported } from "./isImported.js";

const source = ts.createSourceFile(
  "test.ts",
  `
import Default from "package";
import { Original as Local, Direct } from './local.js';
import * as Namespace from "namespace";
const privateValue = 1;
export const first = 2, second = 3;
export let third = 4;
export function ignored() {}
`,
  ts.ScriptTarget.Latest,
  true,
);

test("finds exported variable declarations only", () => {
  expect(
    getExportedVariables(source).flatMap((statement) =>
      statement.declarationList.declarations.map((d) => d.name.getText(source)),
    ),
  ).toEqual(["first", "second", "third"]);
});

test.each([
  ["Default", ["package"], true],
  ["Local", ["./local.js"], true],
  ["Direct", ["./other", "./local.js"], true],
  ["Original", ["./local.js"], false],
  ["Direct", ["package"], false],
  ["Missing", ["package"], false],
])(
  "detects local binding %s at the specified module",
  (name, paths, expected) => {
    expect(isImported(source, name, paths)).toBe(expected);
  },
);
