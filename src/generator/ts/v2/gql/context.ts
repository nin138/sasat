import { TsFile } from '../file';
import { TsInterface } from '../code/node/interface';
import { PropertySignature } from '../code/node/propertySignature';
import { ContextNode } from '../../../../node/gql/contextNode';

export class TsGeneratorGqlContext {
  generate(contexts: ContextNode[]): string {
    return new TsFile(
      new TsInterface('BaseGqlContext')
        .addProperties(contexts.map(it => new PropertySignature(it.name, it.type.toTsType())))
        .export(),
    ).toString();
  }
}
