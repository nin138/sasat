import typescript from 'typescript';
import { RootNode } from '../../nodes/rootNode.js';
import { JoinCustomConditionNode } from '../../nodes/JoinConditionNode.js';
import { unique } from '../../../runtime/util.js';
import { TsFile, tsg, TsStatement } from '../../../tsg/index.js';
import { ImportDeclaration as TsgImport } from '../../../tsg/importDeclaration.js';
import { isImported } from './scripts/ast/isImported.js';
import { getExportedVariables } from './scripts/ast/getExportedVariables.js';
import { tsFileNames } from './tsFileNames.js';

const { createSourceFile, ScriptTarget } = typescript;

export const generateUserDefinedCondition = (
  root: RootNode,
  content: string,
): string | null => {
  const customConditionNames = unique(
    root.entities.flatMap(it => [
      ...it.references.flatMap(it =>
        it.joinCondition
          .filter(it => it.kind === 'custom')
          .map(it => (it as JoinCustomConditionNode).conditionName),
      ),
      ...it.referencedBy.flatMap(it =>
        it.joinCondition
          .filter(it => it.kind === 'custom')
          .map(it => (it as JoinCustomConditionNode).conditionName),
      ),
    ]),
  );
  if (customConditionNames.length === 0) return null;
  const sourceFile = createSourceFile(
    tsFileNames.conditions + '.ts',
    content,
    ScriptTarget.ESNext,
  );
  const exportedVariables = getExportedVariables(sourceFile);
  const contextImported = isImported(sourceFile, 'GQLContext', [
    './context',
    './context.js',
  ]);
  const customConditionImported = isImported(sourceFile, 'CustomCondition', [
    'sasat',
  ]);
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
