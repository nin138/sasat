import typescript, { ImportDeclaration, SourceFile } from 'typescript';
const { SyntaxKind } = typescript;

export const isImported = (
  sourceFile: SourceFile,
  type: string,
  paths: string[],
) => {
  const importDeclarations = sourceFile.statements.filter(
    it => it.kind === SyntaxKind.ImportDeclaration,
  ) as ImportDeclaration[];
  return importDeclarations.some(it => {
    if (
      !paths.some(path => {
        const text = it.moduleSpecifier.getText(sourceFile);
        return `'${path}'` === text || `"${path}"` === text;
      })
    )
      return false;
    const binding = it.importClause?.namedBindings;
    if (it.importClause?.name?.getText(sourceFile) === type) return true;
    if (binding?.kind !== SyntaxKind.NamedImports) return false;
    return binding.elements.some(it => {
      return it.name.text.trim() === type;
    });
  });
};
