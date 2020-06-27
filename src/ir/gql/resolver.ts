export interface IrGqlResolver {
  __type: 'child' | 'parent';
  currentEntity: string;
  currentColumn: string;
  parentEntity: string;
  parentColumn: string;
  gqlReferenceName: string;
  functionName: string;
}
