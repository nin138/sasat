import type {
  Create,
  Delete,
  Update,
} from "../runtime/dsl/mutation/mutation.js";
import type { TableInfo } from "../runtime/dsl/query/createQueryResolveInfo.js";
import type { CommandResponse, SQLExecutor } from "./connectors/dbClient.js";
import { type SqlGenerator, sqlFor } from "./sqlGenerator.js";

type Mutation =
  | { kind: "create"; dsl: Create; tableInfo: TableInfo }
  | { kind: "update"; dsl: Update; tableInfo: TableInfo }
  | { kind: "delete"; dsl: Delete };

/** Select an execution path before compiling; failed writes must never be retried. */
export function executeMutation(
  client: SQLExecutor,
  mutation: Mutation,
  generator: SqlGenerator = sqlFor(client),
): Promise<CommandResponse> {
  if (client.supportsParameterizedStatements) {
    if (typeof client.executeCommand !== "function")
      throw new Error("Parameterized SQL executor requires executeCommand");
    switch (mutation.kind) {
      case "create":
        return client.executeCommand(
          generator.compileCreate(mutation.dsl, mutation.tableInfo),
        );
      case "update":
        return client.executeCommand(
          generator.compileUpdate(mutation.dsl, mutation.tableInfo),
        );
      case "delete":
        return client.executeCommand(generator.compileDelete(mutation.dsl));
    }
  }
  switch (mutation.kind) {
    case "create":
      return client.rawCommand(
        generator.create(mutation.dsl, mutation.tableInfo),
      );
    case "update":
      return client.rawCommand(
        generator.update(mutation.dsl, mutation.tableInfo),
      );
    case "delete":
      return client.rawCommand(generator.delete(mutation.dsl));
  }
}
