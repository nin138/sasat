import type { SqlGenerator } from "../../../../db/sqlGenerator.js";
import type { SqlStatement } from "../../../../db/sqlStatement.js";
import { createStatementContext } from "../../../../db/statementContext.js";
import type { Query } from "../query.js";

export function compileQuery(
  query: Query,
  generator: SqlGenerator,
): SqlStatement {
  const context = createStatementContext(generator);
  return context.finish(context.query(query));
}
