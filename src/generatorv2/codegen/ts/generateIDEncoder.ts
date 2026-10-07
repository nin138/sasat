import typescript from "typescript";
import { DBColumnTypes } from "../../../migration/column/columnTypes.js";
import { nonNullable } from "../../../runtime/util.js";
import { ImportDeclaration } from "../../../tsg/importDeclaration.js";
import { TsFile, type TsStatement, tsg } from "../../../tsg/index.js";
import type { RootNode } from "../../nodes/rootNode.js";
import { getExportedVariables } from "./scripts/ast/getExportedVariables.js";
import { isImported } from "./scripts/ast/isImported.js";
import { tsFileNames } from "./tsFileNames.js";

const { createSourceFile, ScriptTarget } = typescript;

const hashIds = "HashIds";

export const generateIDEncoder = (
  root: RootNode,
  content: string,
): string | null => {
  const fields = root.entities
    .map((it) => it.fields.find((it) => it.column.option.autoIncrementHashId))
    .filter(nonNullable);
  if (fields.length === 0) return null;
  const sourceFile = createSourceFile(
    tsFileNames.encoder + ".ts",
    content,
    ScriptTarget.ESNext,
  );
  sourceFile.getChildren().map((it) => it);
  const exportedVariables = getExportedVariables(sourceFile);

  const hashIdImported = isImported(sourceFile, hashIds, ["hashids"]);
  const statements: TsStatement[] = [];
  const encoderNames = new Set<string>();
  const replacements: { start: number; end: number; text: string }[] = [];
  fields.forEach((field) => {
    const name = field.entity.name.IDEncoderName();
    const existing = exportedVariables.find((it) => {
      return (
        it.declarationList.declarations[0].name.getText(sourceFile) === name
      );
    });
    const encoder =
      field.dbType === DBColumnTypes.bigInt
        ? "makeBigIntIdEncoder"
        : "makeNumberIdEncoder";
    if (existing) {
      const initializer = existing.declarationList.declarations[0].initializer;
      if (
        encoder === "makeBigIntIdEncoder" &&
        isImported(sourceFile, "makeNumberIdEncoder", ["sasat"]) &&
        initializer &&
        typescript.isCallExpression(initializer) &&
        initializer.expression.getText(sourceFile) === "makeNumberIdEncoder"
      ) {
        replacements.push({
          start: initializer.expression.getStart(sourceFile),
          end: initializer.expression.getEnd(),
          text: encoder,
        });
        encoderNames.add(encoder);
      }
      return;
    }
    encoderNames.add(encoder);
    statements.push(
      tsg
        .variable(
          "const",
          name,
          tsg
            .identifier(encoder)
            .call(
              tsg.new(
                tsg.identifier(hashIds),
                tsg.string(
                  field.column.option.hashSalt || field.entity.name.name,
                ),
              ),
            ),
        )
        .export(),
    );
  });

  const imports = hashIdImported ? "" : 'import HashIds from "hashids";\n';
  const makeEncoder = [...encoderNames]
    .filter((name) => !isImported(sourceFile, name, ["sasat"]))
    .map((name) => new ImportDeclaration([name], "sasat").toString())
    .join("\n");
  const addition =
    statements.length === 0 ? "" : "\n" + new TsFile(...statements).toString();
  for (const replacement of replacements.sort((a, b) => b.start - a.start))
    content =
      content.slice(0, replacement.start) +
      replacement.text +
      content.slice(replacement.end);
  return imports + makeEncoder + content + addition;
};
