import typescript from "typescript";
import { unique } from "../../../runtime/util.js";
import { ImportDeclaration as TsgImport } from "../../../tsg/importDeclaration.js";
import { TsFile, type TsStatement, tsg } from "../../../tsg/index.js";
import type { JoinCustomConditionNode } from "../../nodes/JoinConditionNode.js";
import type { RootNode } from "../../nodes/rootNode.js";
import { getExportedVariables } from "./scripts/ast/getExportedVariables.js";
import { isImported } from "./scripts/ast/isImported.js";
import { tsFileNames } from "./tsFileNames.js";

const { createSourceFile, ScriptTarget } = typescript;

const bindingNames = (name: typescript.BindingName): string[] =>
  typescript.isIdentifier(name)
    ? [name.text]
    : name.elements.flatMap((element) =>
        typescript.isOmittedExpression(element)
          ? []
          : bindingNames(element.name),
      );

export const generateUserDefinedCondition = (
  root: RootNode,
  content: string,
): string | null => {
  const customConditionNames = unique(
    root.entities.flatMap((it) => [
      ...it.references.flatMap((it) =>
        it.joinCondition
          .filter((it) => it.kind === "custom")
          .map((it) => (it as JoinCustomConditionNode).conditionName),
      ),
      ...it.referencedBy.flatMap((it) =>
        it.joinCondition
          .filter((it) => it.kind === "custom")
          .map((it) => (it as JoinCustomConditionNode).conditionName),
      ),
    ]),
  );
  if (customConditionNames.length === 0) return null;
  const sourceFile = createSourceFile(
    tsFileNames.conditions + ".ts",
    content,
    ScriptTarget.ESNext,
  );
  const exportedNames = new Set(
    getExportedVariables(sourceFile).flatMap((statement) =>
      statement.declarationList.declarations.flatMap((declaration) =>
        bindingNames(declaration.name),
      ),
    ),
  );
  for (const statement of sourceFile.statements) {
    if (
      typescript.isFunctionDeclaration(statement) &&
      statement.name &&
      statement.modifiers?.some(
        (modifier) => modifier.kind === typescript.SyntaxKind.ExportKeyword,
      ) &&
      !statement.modifiers?.some(
        (modifier) => modifier.kind === typescript.SyntaxKind.DefaultKeyword,
      )
    ) {
      exportedNames.add(statement.name.text);
    }
    if (
      typescript.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.exportClause &&
      typescript.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        if (!element.isTypeOnly) exportedNames.add(element.name.text);
      }
    }
  }
  const contextImported = isImported(sourceFile, "GQLContext", [
    "./context",
    "./context.js",
  ]);
  const customConditionImported = isImported(sourceFile, "CustomCondition", [
    "sasat",
  ]);
  const statements: TsStatement[] = [];
  customConditionNames.forEach((conditionName) => {
    if (!exportedNames.has(conditionName)) {
      statements.push(
        tsg
          .variable(
            "const",
            conditionName,
            tsg.arrowFunc(
              [],
              undefined,
              tsg.block(
                tsg.throw(
                  tsg.new(
                    tsg.identifier("Error"),
                    tsg.string("TODO: Not Implemented"),
                  ),
                ),
              ),
            ),
            tsg.typeRef("CustomCondition", [tsg.typeRef("GQLContext")]),
          )
          .export(),
      );
    }
  });

  const context = contextImported
    ? ""
    : new TsgImport(["GQLContext"], "./context").toString() + "\n";
  const condition = customConditionImported
    ? ""
    : new TsgImport(["CustomCondition"], "sasat").toString() + "\n";
  const addition =
    statements.length === 0 ? "" : "\n" + new TsFile(...statements).toString();
  return context + condition + content + addition;
};
