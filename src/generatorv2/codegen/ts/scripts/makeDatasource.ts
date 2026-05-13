import { type TsExpression, tsg } from "../../../../tsg/index.js";
import { type Directories, Directory } from "../../../directory.js";
import type { EntityName } from "../../../nodes/entityName.js";

export const makeDatasource = (
  entity: EntityName,
  importFrom: Directories,
  args?: TsExpression[],
) => {
  return tsg.new(
    tsg
      .identifier(entity.dataSourceName())
      .importFrom(Directory.resolve(importFrom, "DATA_SOURCES", entity.name)),
    ...(args || []),
  );
};
