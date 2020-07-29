import { testStoreHandler } from '../../test/testDataStore';
import { Parser } from './parser';
import { TableHandler } from '../entity/table';
import { DBColumnTypes } from '../migration/column/columnTypes';
import { ReferenceColumn } from '../entity/referenceColumn';

describe('Parser', () => {
  const parser = new Parser(testStoreHandler);
  it('createEntity', () => {
    const entity = parser['createEntity'](testStoreHandler.table('user')! as TableHandler);
    expect(entity.entityName).toBe('User');
    expect(entity.fields[0].fieldName).toBe('userId');
  });

  it('paramsToQueryName', () => {
    expect(Parser.paramsToQueryName('foo', 'bar')).toBe('findByFooAndBar');
  });

  it('createPrimaryQuery', () => {
    expect(parser['createPrimaryQuery'](testStoreHandler.table('user') as TableHandler)).toStrictEqual({
      queryName: 'findByUserId',
      returnType: 'User',
      isReturnsArray: false,
      isReturnDefinitelyExist: false,
      params: [
        {
          name: 'userId',
          type: DBColumnTypes.int,
        },
      ],
    });
  });

  it('createRefQuery', () => {
    const refColumn = testStoreHandler.table('post')!.column('userId') as ReferenceColumn;
    expect(parser['createRefQuery'](refColumn)).toStrictEqual({
      queryName: Parser.paramsToQueryName(refColumn.name),
      returnType: 'Post',
      isReturnsArray: true,
      isReturnDefinitelyExist: false,
      params: [{ name: 'userId', type: DBColumnTypes.int }],
    });
  });

  it('getQueries', () => {
    expect(parser['getQueries'](testStoreHandler.table('user') as TableHandler)).toStrictEqual([
      {
        queryName: 'findByUserId',
        returnType: 'User',
        isReturnsArray: false,
        isReturnDefinitelyExist: false,
        params: [
          {
            name: 'userId',
            type: 'int',
          },
        ],
      },
    ]);
  });

  it('createRepository', () => {
    const user = testStoreHandler.table('user') as TableHandler;
    expect(parser['createRepository'](user)).toStrictEqual({
      tableName: 'user',
      entityName: 'User',
      primaryKeys: ['userId'],
      autoIncrementColumn: 'userId',
      defaultValues: [
        {
          columnName: 'name',
          value: 'no name',
        },
        {
          columnName: 'nickName',
          value: null,
        },
      ],
      defaultCurrentTimestampColumns: ['createdAt', 'updatedAt'],
      onUpdateCurrentTimestampColumns: ['updatedAt'],
      queries: parser['getQueries'](user),
      useClasses: [
        {
          path: `entity/user`,
          classNames: ['User', `UserCreatable`, `UserIdentifiable`],
        },
      ],
      subscription: {
        filter: ['name'],
        onCreate: true,
        onDelete: false,
        onUpdate: true,
      },
    });
  });
});
