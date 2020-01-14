import { IrGqlResolver } from '../../../ir/gql/resolver';
import { TsCodeGenNestedObject } from '../code/nestedObject';
import { TsFileGenerator } from '../tsFileGenerator';

export class TsGeneratorGqlResolver extends TsFileGenerator {
  private obj = new TsCodeGenNestedObject();
  private addResolver(resolver: IrGqlResolver) {
    this.obj.set(
      [resolver.parentEntity, resolver.gqlReferenceName],
      `(${resolver.parentEntity}: ${resolver.parentEntity}) => new ${resolver.currentEntity}Repository().${resolver.functionName}(${resolver.parentEntity}.${resolver.parentColumn})`,
    );
    this.addImport(`../repository/${resolver.parentEntity}`, `${resolver.parentEntity}Repository`);
    this.addImport(`./entity/${resolver.parentEntity}`, `${resolver.parentEntity}`);
  }
  constructor(irResolvers: IrGqlResolver[]) {
    super();
    this.addImport('./query', 'query');
    this.addImport('./mutation', 'mutation');
    this.addImport('./subscription', 'subscription');
    irResolvers.forEach(it => this.addResolver(it));

    const resolvers = [
      'Query: query',
      'Mutation: mutation',
      'Subscription: subscription',
      `...${this.obj.toTsString()}`,
    ];
    this.addLine(`\
export const resolvers = {
${resolvers.map(it => `  ${it},`).join('\n')}
};
`);
  }
}
