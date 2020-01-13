import { IrGqlResolver } from '../../../ir/gql/resolver';

export const generateTsResolverString = (additionalResolvers: string[]) => {
  const resolvers = ['Query: query', 'Mutation: mutation', 'Subscription: subscription', ...additionalResolvers];
  return `\
import { query } from './query';
import { mutation } from './mutation';
import {subscription} from "./subscription";

export const resolvers = {
${resolvers.map(it => `  ${it},`).join('\n')}
};

`;
};

export class TsGeneratorGqlResolver {
  obj: { [key: string]: { [field: string]: string } } = {};
  private addResolver(resolver: IrGqlResolver) {
    const newResolver: { [key: string]: string } = {};
    newResolver[resolver.referenceName] = `\
    (${resolver.parentEntity}) => new ${resolver.entity}Repository().${resolver.fieldName}(${resolver.parentEntity}.${resolver.parentColumn})`;
    this.obj[resolver.entity] = { ...this.obj[resolver.entity], ...newResolver };
  }
  constructor(resolvers: IrGqlResolver[]) {
    resolvers.forEach(it => this.addResolver(it));
  }
}
