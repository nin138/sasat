import { TsFile } from '../file.js';
import { TsInterface } from '../code/node/interface.js';
import { PropertySignature } from '../code/node/propertySignature.js';
import { ContextNode } from '../../../parser/node/gql/contextNode.js';

export class ContextGenerator {
  generate(contexts: ContextNode[]): TsFile {
    return new TsFile(
      new TsInterface('BaseGqlContext')
        .addProperties(
          contexts.map(
            it => new PropertySignature(it.name, it.type.toTsType()),
          ),
        )
        .export(),
    );
  }
}
