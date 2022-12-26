import { DataStoreHandler } from '../../migration/dataStore.js';
import { QueryNode } from '../nodes/queryNode.js';
import { TableHandler } from '../../migration/serializable/table.js';
import { lowercaseFirstLetter, plural } from '../../util/stringUtil.js';
import { ArgNode } from '../nodes/typeNode.js';
import { makePrimaryFindQueryName } from '../codegen/names.js';

export const makeQueryNodes = (store: DataStoreHandler): QueryNode[] => {
  return store.tables.flatMap(it => {
    return makeTableQueryNodes(it);
  });
};

const makeTableQueryNodes = (table: TableHandler): QueryNode[] => {
  const result: QueryNode[] = [];
  if (!table.gqlOption.enabled) return result;
  if (table.gqlOption.query.find) result.push(makePrimaryFindQuery(table));
  if (table.gqlOption.query.list) result.push(makeListQuery(table));
  return result;
};

const makePrimaryFindQuery = (table: TableHandler): QueryNode => {
  return {
    type: 'primary',
    queryName: lowercaseFirstLetter(table.getEntityName().name),
    entityName: table.getEntityName(),
    dsMethodName: makePrimaryFindQueryName(table.primaryKey),
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

const makeListQuery = (table: TableHandler): QueryNode => {
  const pageable = table.gqlOption.query.list === 'paging';
  return {
    type: 'list',
    queryName: lowercaseFirstLetter(plural(table.getEntityName().name)),
    entityName: table.getEntityName(),
    dsMethodName: 'find',
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
