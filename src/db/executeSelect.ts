import type { Query } from "../runtime/dsl/query/query.js";
import type { SQLExecutor } from "./connectors/dbClient.js";
import { type SqlGenerator, sqlFor } from "./sqlGenerator.js";

/** Legacy executors keep their existing path; binding failures are never retried. */
export function executeSelect(
  client: SQLExecutor,
  query: Query,
  generator: SqlGenerator = sqlFor(client),
) {
  if (client.supportsParameterizedStatements) {
    if (typeof client.executeQuery !== "function")
      throw new Error("Parameterized SQL executor requires executeQuery");
    return client.executeQuery(generator.compileQuery(query));
  }
  return client.rawQuery(generator.query(query));
}
