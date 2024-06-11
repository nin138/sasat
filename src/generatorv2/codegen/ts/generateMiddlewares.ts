import typescript from 'typescript';
import { RootNode } from '../../nodes/rootNode.js';
import { TsFile, tsg, TsStatement } from '../../../tsg/index.js';
import { isImported } from './scripts/ast/isImported.js';
import { getExportedVariables } from './scripts/ast/getExportedVariables.js';
import { tsFileNames } from './tsFileNames.js';
import { ImportDeclaration as TsgImport } from '../../../tsg/importDeclaration.js';
import { unique } from '../../../runtime/util.js';

const { createSourceFile, ScriptTarget } = typescript;

export const generateMiddlewares = (
  root: RootNode,
  content: string,
): string | null => {
  const middlewares = unique(
    root.entities.flatMap(it => [
      ...it.queries.flatMap(it => it.middlewares),
      ...it.mutations.flatMap(it => it.middlewares),
    ]),
  );
  if (middlewares.length === 0) return null;
  const sourceFile = createSourceFile(
    tsFileNames.middleware + '.ts',
    content,
    ScriptTarget.ESNext,
  );
  const exportedVariables = getExportedVariables(sourceFile);

  const statements: TsStatement[] = [];
  middlewares.forEach(middleware => {
    const exists = exportedVariables.some(it => {
      return (
        it.declarationList.declarations[0].name.getText(sourceFile) ===
        middleware
      );
    });
    if (exists) return;
    statements.push(
      tsg
        .variable(
          'const',
          middleware,
          tsg.arrowFunc(
            [tsg.parameter('args')],
            undefined,
            tsg.block(
              tsg.throw(
                tsg.new(
                  tsg.identifier('Error'),
                  tsg.string('TODO: Not implemented'),
                ),
              ),
              tsg.return(tsg.identifier('args')),
            ),
          ),
          tsg.typeRef('ResolverMiddleware', [tsg.typeRef('GQLContext')]),
        )
        .export(),
    );
  });

  const contextImported = isImported(sourceFile, 'GQLContext', [
    './context',
    './context.js',
  ]);
  const resolverMiddlewareImported = isImported(
    sourceFile,
    'ResolverMiddleware',
    ['sasat'],
  );

  const imports = [
    contextImported
      ? ''
      : new TsgImport(['GQLContext'], './context').toString() + '\n',
    resolverMiddlewareImported
      ? ''
      : new TsgImport(['ResolverMiddleware'], 'sasat').toString() + '\n',
  ].join('');
  const addition =
    statements.length === 0 ? '' : '\n' + new TsFile(...statements).toString();
  return imports + content + addition;
};
