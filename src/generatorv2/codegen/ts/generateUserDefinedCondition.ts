import typescript, { ImportDeclaration, SourceFile } from 'typescript';
import { RootNode } from '../../nodes/rootNode.js';
import { CustomConditionNode } from '../../nodes/ConditionNode.js';
import { unique } from '../../../runtime/util.js';
import { TsFile, tsg, TsStatement } from '../../../tsg/index.js';
import { ImportDeclaration as TsgImport } from '../../../tsg/importDeclaration.js';

type VariableStatement = typescript.VariableStatement;
const { createSourceFile, ScriptTarget, SyntaxKind } = typescript;

const isImported = (sourceFile: SourceFile, type: string, paths: string[]) => {
  const importDeclarations = sourceFile.statements.filter(
    it => it.kind === SyntaxKind.ImportDeclaration,
  ) as ImportDeclaration[];
  return importDeclarations.some(it => {
    if (!paths.includes(it.moduleSpecifier.getText(sourceFile))) return false;
    const binding = it.importClause?.namedBindings;
    if (binding?.kind !== SyntaxKind.NamedImports) return false;
    return binding.elements.some(it => it.name.escapedText === type);
  });
};

export const generateUserDefinedCondition = (
  root: RootNode,
  content: string,
): string => {
  const sourceFile = createSourceFile(
    'conditions.ts',
    content,
    ScriptTarget.ESNext,
  );
  sourceFile.getChildren().map(it => it);
  const exportedVariables = sourceFile.statements.filter(
    it =>
      it.kind === SyntaxKind.VariableStatement &&
      (it as VariableStatement).modifiers?.some(
        it => it.kind === SyntaxKind.ExportKeyword,
      ),
  ) as VariableStatement[];

  const contextImported = isImported(sourceFile, 'GQLContext', [
    '"./context"',
    '"./context.js"',
  ]);
  const customConditionImported = isImported(sourceFile, 'CustomCondition', [
    '"sasat"',
  ]);

  const customConditionNames = unique(
    root.entities.flatMap(it => [
      ...it.references.flatMap(it =>
        it.joinCondition
          .filter(it => it.kind === 'custom')
          .map(it => (it as CustomConditionNode).conditionName),
      ),
      ...it.referencedBy.flatMap(it =>
        it.joinCondition
          .filter(it => it.kind === 'custom')
          .map(it => (it as CustomConditionNode).conditionName),
      ),
    ]),
  );
  const statements: TsStatement[] = [];
  customConditionNames.forEach(conditionName => {
    const exists = exportedVariables.some(it => {
      return (
        it.declarationList.declarations[0].name.getText(sourceFile) ===
        conditionName
      );
    });
    if (!exists) {
      statements.push(
        tsg
          .variable(
            'const',
            conditionName,
            tsg.arrowFunc(
              [],
              undefined,
              tsg.block(
                tsg.throw(
                  tsg.new(
                    tsg.identifier('Error'),
                    tsg.string('TODO: Not Implemented'),
                  ),
                ),
              ),
            ),
            tsg.typeRef('CustomCondition', [tsg.typeRef('GQLContext')]),
          )
          .export(),
      );
    }
  });

  const context = contextImported
    ? ''
    : new TsgImport(['GQLContext'], './context').toString() + '\n';
  const condition = customConditionImported
    ? ''
    : new TsgImport(['CustomCondition'], 'sasat').toString() + '\n';
  return (
    context + condition + content + '\n' + new TsFile(...statements).toString()
  );
};
