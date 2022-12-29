import { EntityNode } from '../../nodes/entityNode.js';
import { TsFile, tsg } from '../../../tsg/index.js';
import { Directory } from '../../directory.js';

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
