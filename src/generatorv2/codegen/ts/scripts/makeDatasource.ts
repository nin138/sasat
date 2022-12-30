import { EntityName } from '../../../nodes/entityName.js';
import { TsExpression, tsg } from '../../../../tsg/index.js';
import { Directories, Directory } from '../../../directory.js';

export const makeDatasource = (
  entity: EntityName,
  importFrom: Directories,
  args?: TsExpression[],
) => {
  return tsg.new(
    tsg
      .identifier(entity.dataSourceName())
      .importFrom(Directory.resolve(importFrom, 'DATA_SOURCES', entity.name)),
    ...(args || []),
  );
};
