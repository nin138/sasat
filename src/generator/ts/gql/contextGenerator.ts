import { TsFile, TsInterface, PropertySignature } from '../../../tsg/index.js';
import { ContextNode } from '../../../parser/node/gql/contextNode.js';

export class ContextGenerator {
  generate(contexts: ContextNode[]): TsFile {
    return new TsFile(
      new TsInterface('BaseGQLContext')
        .addProperties(
          contexts.map(
            it => new PropertySignature(it.name, it.type.toTsType()),
          ),
        )
        .export(),
    ).disableEsLint();
  }
}
