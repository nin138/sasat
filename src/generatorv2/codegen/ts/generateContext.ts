import { RootNode } from '../../nodes/rootNode.js';
import { TsFile, tsg } from '../../../tsg/index.js';
import { columnTypeToTsType } from '../../../migration/column/columnTypes.js';

export const generateContext = (root: RootNode) => {
  return new TsFile(
    tsg
      .interface('BaseGQLContext')
      .addProperties(
        root.contexts.map(it =>
          tsg.propertySignature(
            it.name,
            tsg.typeRef(columnTypeToTsType(it.dbtype)),
          ),
        ),
      )
      .export(),
  ).disableEsLint();
};
