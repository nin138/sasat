import { SerializedTable } from '../../../migration/serialized/serializedStore';
import { Reference, SerializedNormalColumn } from '../../../migration/serialized/serializedColumn';
import { Relation } from '../../..';
import { ForeignKeyReferentialAction } from '../../../migration/data/foreignKey';
import { DBColumnTypes } from '../../../migration/column/columnTypes';
import { lexColumn } from './lexer/columnLexer';
import { Token, TokenKind } from './lexer/lexer';

const getInnerStr = (str: string, start: string, end: string, fromIndex = 0) => {
  const startIndex = str.indexOf(start, fromIndex) + 1;
  const endIndex = start.indexOf(end, startIndex);
  return str.slice(startIndex, endIndex);
};

const getReferentialAction = (str: string, from: number) => {
  const slice = str.slice(from);
  if (slice.startsWith('RESTRICT')) return ForeignKeyReferentialAction.Restrict;
  if (slice.startsWith('CASCADE')) return ForeignKeyReferentialAction.Cascade;
  if (slice.startsWith('SET NULL')) return ForeignKeyReferentialAction.SetNull;
  if (slice.startsWith('NO ACTION')) return ForeignKeyReferentialAction.NoAction;
  return undefined;
};

const getColumns = (str: string) =>
  getInnerStr(str, '(', ')')
    .split(',')
    .map(it => it.replace('`', ''));
const startStrMap: { word: string; fn: (str: string, table: SerializedTable) => SerializedTable }[] = [
  { word: 'PRIMARY KEY', fn: (str: string, table) => ({ ...table, primaryKey: getColumns(str) }) },
  {
    word: 'UNIQUE KEY',
    fn: (str: string, table) => ({ ...table, uniqueKeys: [...table.uniqueKeys, getColumns(str)] }),
  },
  {
    word: 'KEY',
    fn: (str, table) => ({
      ...table,
      indexes: [
        ...table.indexes,
        {
          constraintName: getInnerStr(str, '`', '`'),
          columns: getColumns(str),
        },
      ],
    }),
  },
  {
    word: 'CONSTRAINT',
    fn: (str: string, table) => {
      let i = indexOfEndOfFind(str, 0, 'CONSTRAINT');
      // const constraintName = getInnerStr(str, '`', '`', i);
      i = indexOfEndOfFind(str, i, 'FOREIGN KEY');
      const columnName = getInnerStr(str, '`', '`', i);
      i = indexOfEndOfFind(str, i, 'REFERENCES');
      const targetTable = getInnerStr(str, '`', '`', i);
      i += targetTable.length + 4;
      const targetColumn = getInnerStr(str, '`', '`', i);
      let j = indexOfEndOfFind(str, i, 'ON UPDATE');
      const onUpdate = j !== -1 ? getReferentialAction(str, j + 1) : undefined;
      j = indexOfEndOfFind(str, i, 'ON DELETE');
      const onDelete = j !== -1 ? getReferentialAction(str, j + 1) : undefined;
      const isColumnUnique = table.uniqueKeys.filter(it => it.length === 1).find(it => it[0] === columnName);
      const sameTableRefs = table.columns.filter(it => it.hasReference && it.reference.targetTable === targetTable);
      const reference: Reference = {
        targetTable,
        targetColumn,
        columnName,
        relation: isColumnUnique ? Relation.OneOrZero : Relation.Many,
        relationName: sameTableRefs.length !== 0 ? targetTable + sameTableRefs.length : undefined,
        onUpdate,
        onDelete,
      };
      return {
        ...table,
        columns: table.columns.map(it =>
          it.columnName === columnName ? { ...it, hasReference: true, reference } : it,
        ),
      };
    },
  },
  {
    word: '`',
    fn: (str, table) => {
      const tokens = lexColumn(str);
      const keywords = tokens.filter(it => it.kind === TokenKind.Keyword).map(it => it.value);
      const getDefault = () => {
        const index = tokens.findIndex(it => it.kind === TokenKind.Keyword && it.value === 'DEFAULT');
        if (index === -1) return undefined;
        const next = tokens[index + 1];
        if (next.kind === TokenKind.String || next.kind === TokenKind.Number) return next;
        if (next.kind === TokenKind.Identifier && next.value === 'CURRENT_TIMESTAMP') return next;
        return undefined;
      };
      const defaultToken = getDefault();
      const getInParenValues = (tokens: Token[]) => {
        const start = tokens.findIndex(it => it.kind === TokenKind.Separator && it.value === '(');
        const end = tokens.findIndex(it => it.kind === TokenKind.Separator && it.value === ')');
        return tokens.slice(start + 1, end);
      };
      const inPrenValues = getInParenValues(tokens);
      const column: SerializedNormalColumn = {
        hasReference: false,
        columnName: tokens[0].value,
        type: tokens[1].value as DBColumnTypes,
        notNull: keywords.includes('NOT NULL'),
        default: defaultToken && defaultToken.kind !== TokenKind.Identifier ? defaultToken.value : undefined,
        zerofill: keywords.includes('zerofill'),
        signed: keywords.includes('unsigned') ? false : keywords.includes('signed') ? true : undefined,
        autoIncrement: keywords.includes('AUTO_INCREMENT'),
        length: inPrenValues.length > 0 ? +inPrenValues[0].value : undefined,
        scale: inPrenValues.length > 1 ? +inPrenValues[1].value : undefined,
        defaultCurrentTimeStamp: defaultToken?.kind === TokenKind.Identifier,
        onUpdateCurrentTimeStamp: keywords.includes('ON UPDATE'),
      };
      return {
        ...table,
        columns: [...table.columns, column],
      };
    },
  },
  { word: ')', fn: (_1, table) => table },
];

const indexOfEndOfFind = (str: string, currentIndex: number, find: string) => {
  const i = str.slice(currentIndex).indexOf(find);
  if (i === -1) return -1;
  return currentIndex + i + find.length;
};

export const serializeCreateTable = (str: string): SerializedTable => {
  const lines = str.split('\n').map(it => it.trim());
  const table: SerializedTable = {
    tableName: getInnerStr(lines[0], '`', '`'),
    columns: [],
    primaryKey: [],
    uniqueKeys: [],
    indexes: [],
    gqlOption: {
      mutation: {
        create: true,
        update: true,
        delete: true,
        fromContextColumns: [],
      },
      subscription: {
        onCreate: false,
        onUpdate: false,
        onDelete: false,
        filter: [],
      },
    },
  };

  lines.slice(1).forEach(line => {
    startStrMap.find(it => line.startsWith(it.word))!.fn(line, table);
  });
  return table;
};
