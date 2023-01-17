import typescript from 'typescript';
import { RootNode } from '../../nodes/rootNode.js';
import { nonNullable } from '../../../runtime/util.js';
import { TsFile, tsg, TsStatement } from '../../../tsg/index.js';
import { isImported } from './scripts/ast/isImported.js';
import { getExportedVariables } from './scripts/ast/getExportedVariables.js';
import { tsFileNames } from './tsFileNames.js';
import { ImportDeclaration } from '../../../tsg/importDeclaration.js';

const { createSourceFile, ScriptTarget } = typescript;

const hashIds = 'HashIds';

export const generateIDEncoder = (
  root: RootNode,
  content: string,
): string | null => {
  const fields = root.entities
    .map(it => it.fields.find(it => it.column.option.autoIncrementHashId))
    .filter(nonNullable);
  if (fields.length === 0) return null;
  const sourceFile = createSourceFile(
    tsFileNames.encoder + '.ts',
    content,
    ScriptTarget.ESNext,
  );
  sourceFile.getChildren().map(it => it);
  const exportedVariables = getExportedVariables(sourceFile);

  const hashIdImported = isImported(sourceFile, hashIds, ['hashids']);
  const statements: TsStatement[] = [];
  fields.forEach(field => {
    const name = field.entity.name.IDEncoderName();
    const exists = exportedVariables.some(it => {
      return (
        it.declarationList.declarations[0].name.getText(sourceFile) === name
      );
    });
    if (exists) return;
    statements.push(
      tsg
        .variable(
          'const',
          name,
          tsg
            .identifier('makeNumberIdEncoder')
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

  const imports = hashIdImported ? '' : 'import HashIds from "hashids";\n';
  const makeEncoder = isImported(sourceFile, 'makeNumberIdEncoder', ['sasat'])
    ? ''
    : new ImportDeclaration(['makeNumberIdEncoder'], 'sasat').toString();

  return (
    imports +
    makeEncoder +
    content +
    '\n' +
    new TsFile(...statements).toString()
  );
};
