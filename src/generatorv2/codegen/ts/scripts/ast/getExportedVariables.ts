import typescript, { SourceFile, VariableStatement } from 'typescript';
const { SyntaxKind } = typescript;
export const getExportedVariables = (
  sourceFile: SourceFile,
): VariableStatement[] => {
  return sourceFile.statements.filter(
    it =>
      it.kind === SyntaxKind.VariableStatement &&
      (it as VariableStatement).modifiers?.some(
        it => it.kind === SyntaxKind.ExportKeyword,
      ),
  ) as VariableStatement[];
};
