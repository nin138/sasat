import { TsFile, tsg } from '../../../tsg/index.js';
import { Directory } from '../../directory.js';
import type { EntityNode } from '../../nodes/entityNode.js';

export const generateDatasource = (node: EntityNode): TsFile => {
  return new TsFile(
    tsg
      .class(node.name.dataSourceName())
      .extends(
        tsg.extends(
          tsg
            .typeRef(node.name.generatedDataSourceName())
            .importFrom(
              Directory.resolve('DATA_SOURCES', 'GENERATED_DS', node.name.name),
            ),
        ),
      )
      .export(),
  );
};
