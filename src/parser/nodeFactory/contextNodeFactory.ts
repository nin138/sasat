import { ContextNode } from '../node/gql/contextNode.js';
import { TypeNode } from '../node/typeNode.js';
import { TableHandler } from '../../migration/serializable/table.js';

export class ContextNodeFactory {
  create(tables: TableHandler[]): ContextNode[] {
    const obj: Record<string, ContextNode> = {};
    tables.forEach(table =>
      table.gqlOption.mutation.fromContextColumns.forEach(it => {
        const name = it.contextName || it.column;
        obj[name] = new ContextNode(name, new TypeNode(table.column(it.column)!.dataType(), false, false));
      }),
    );
    return Object.values(obj);
  }
}
