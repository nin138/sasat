import type { SqlGenerator } from "../../../db/sqlGenerator.js";
import { createStatementContext } from "../../../db/statementContext.js";
import type { TableInfo } from "../query/createQueryResolveInfo.js";
import {
  type Create,
  type Delete,
  renderCreate,
  renderDelete,
  renderUpdate,
  type Update,
} from "./mutation.js";

export function compileCreate(
  dsl: Create,
  tables: TableInfo,
  generator: SqlGenerator,
) {
  const context = createStatementContext(generator);
  return context.finish(renderCreate(dsl, tables, generator, context.value));
}

export function compileUpdate(
  dsl: Update,
  tables: TableInfo,
  generator: SqlGenerator,
) {
  const context = createStatementContext(generator);
  return context.finish(
    renderUpdate(dsl, tables, generator, context.value, context.nodes),
  );
}

export function compileDelete(dsl: Delete, generator: SqlGenerator) {
  const context = createStatementContext(generator);
  return context.finish(renderDelete(dsl, generator, context.nodes));
}
