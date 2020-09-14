import { ContextNode } from '../node/gql/contextNode';
import { TypeNode } from '../node/typeNode';
import { TableHandler } from '../../migration/serializable/table';

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
