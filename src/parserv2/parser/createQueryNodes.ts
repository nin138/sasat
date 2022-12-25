import { DataStoreHandler } from '../../migration/dataStore.js';
import { QueryNode } from '../nodes/queryNode.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { lowercaseFirstLetter, plural } from '../../util/stringUtil.js';
import { ArgNode } from '../nodes/typeNode.js';

export const createQueryNodes = (store: DataStoreHandler): QueryNode[] => {
  return store.tables.flatMap(it => {
    return createTableQueryNodes(it);
  });
};

const createTableQueryNodes = (table: TableHandler): QueryNode[] => {
  const result: QueryNode[] = [];
  if (!table.gqlOption.enabled) return result;
  if (table.gqlOption.query.find) result.push(createPrimaryFindQuery(table));
  if (table.gqlOption.query.list) result.push(createListQuery(table));
  return result;
};

const createPrimaryFindQuery = (table: TableHandler): QueryNode => {
  return {
    queryName: lowercaseFirstLetter(table.getEntityName().name),
    pageable: false,
    returnType: {
      typeName: table.getEntityName().name,
      nullable: true,
      array: false,
      entity: true,
    },
    args: table.primaryKey.map(it => ({
      name: it,
      type: {
        typeName: table.column(it).dataType() as string,
        nullable: false,
        array: false,
        entity: false,
        dbType: table.column(it).dataType(),
      },
    })),
  };
};

const createListQuery = (table: TableHandler): QueryNode => {
  const pageable = table.gqlOption.query.list === 'paging';
  return {
    queryName: lowercaseFirstLetter(plural(table.getEntityName().name)),
    pageable,
    returnType: {
      typeName: table.getEntityName().name,
      nullable: false,
      array: true,
      entity: true,
    },
    args: pageable ? [pagingArg] : [],
  };
};

const pagingArg: ArgNode = {
  name: 'option',
  type: {
    typeName: 'PagingOption',
    nullable: true,
    array: false,
    entity: true,
  },
};
