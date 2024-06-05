import { Token, TokenKind } from './lexer/lexer.js';
import { SerializedTable } from '../../../migration/serialized/serializedStore.js';
import { camelize } from '../../../util/stringUtil.js';
import { DBColumnTypes } from '../../../migration/column/columnTypes.js';
import {
  defaultColumnOption,
  Reference,
  SerializedNormalColumn,
} from '../../../migration/serialized/serializedColumn.js';
import { defaultGQLOption } from '../../../migration/data/GQLOption.js';
import { columnTypeToGqlPrimitive } from '../../../generatorv2/scripts/columnToGqlType.js';

const splitArray = <T>(array: T[], callback: (item: T) => boolean): T[][] => {
  const indexes: number[] = [];
  array.forEach((it, i) => {
    if (callback(it)) indexes.push(i);
  });
  // [1,2,3]; 2
  let prev = 0;
  const result: T[][] = [];
  indexes.forEach(it => {
    result.push(array.slice(prev, it));
    prev = it + 1;
  });
  result.push(array.slice(prev, array.length));
  return result;
};

interface ParenToken {
  kind: 'Paren';
  tokens: Tokens[];
  value: '';
}

type Tokens = Token | ParenToken;

const isParenToken = (token: Tokens): token is ParenToken => {
  return token.kind === 'Paren';
};

export class CreateTableParser {
  private readonly result: SerializedTable;

  constructor(private readonly tokens: Token[]) {
    this.result = {
      tableName: '',
      columns: [],
      primaryKey: [],
      uniqueKeys: [],
      indexes: [],
      gqlOption: defaultGQLOption(),
      virtualRelations: [],
    };
  }

  private resolveParen() {
    const resolveParen = (tokens: Token[]): Tokens[] => {
      const result: Tokens[] = [];
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.kind === TokenKind.Separator && token.value === '(') {
          const endParen = this.findEndOfParenIndex(tokens, i);
          result.push({
            kind: 'Paren',
            tokens: resolveParen(tokens.slice(i + 1, endParen)),
            value: '',
          });
          i = endParen;
          continue;
        }
        result.push(token);
      }
      return result;
    };
    return resolveParen(this.tokens);
  }

  parse = (): SerializedTable => {
    const parenStart = this.findIndex(TokenKind.Separator, '(', this.tokens);
    this.result.tableName = this.tokens[parenStart - 1].value;
    const tokens = this.resolveParen();
    const definitionTokens = tokens.find(
      it => it.kind === 'Paren',
    ) as ParenToken;
    const definitions = splitArray(
      definitionTokens.tokens,
      token => token.kind === TokenKind.Separator && token.value === ',',
    );
    definitions.forEach(it => {
      const kindIncludes = (kind: string) => !!it.find(it => it.kind === kind);
      if (kindIncludes('PRIMARY')) return this.parsePrimary(it);
      if (kindIncludes('UNIQUE')) return this.parseUnique(it);
      if (kindIncludes('FOREIGN')) return this.parseFkey(it);
      if (kindIncludes('KEY') || kindIncludes('INDEX'))
        return this.parseIndex(it);

      const kind = (it[0] as Token).kind;
      if (kind === TokenKind.Identifier || kind === TokenKind.String)
        return this.parseColumn(it);
      throw new Error('fail to parse sql');
    });
    return this.result;
  };

  private parseColumn(tokens: Tokens[]) {
    const columnName = tokens[0].value;
    const type = tokens[1].value.toLowerCase() as DBColumnTypes;
    const gqlType = columnTypeToGqlPrimitive(type);
    const defaultTokenIndex = tokens.findIndex(it => it.kind === 'DEFAULT');
    const getDefaultValue = () => {
      if (defaultTokenIndex === -1) return undefined;
      const next = tokens[defaultTokenIndex + 1];
      if (next.kind === 'NULL') return undefined;
      if (
        next.kind === TokenKind.Number ||
        gqlType === 'Float' ||
        gqlType === 'Int'
      )
        return +next.value;
      if (next.kind === TokenKind.String) return next.value;
      return undefined;
    };
    const defaultCurrentTimeStamp =
      defaultTokenIndex !== -1 &&
      tokens[defaultTokenIndex + 1].kind === TokenKind.Identifier &&
      tokens[defaultTokenIndex + 1].value.toUpperCase() === 'CURRENT_TIMESTAMP';
    const isOnUpdate = (): boolean => {
      const index = tokens.findIndex(it => it.kind === 'UPDATE');
      return tokens[index + 1].value.toUpperCase() === 'CURRENT_TIMESTAMP';
    };
    const isNotNull = () => {
      let prevIsNot = false;
      return tokens.some(it => {
        if (prevIsNot && it.kind === 'NULL') return true;
        prevIsNot = it.kind === 'NOT';
        return false;
      });
    };
    const identifiers = tokens.filter(it => it.kind === TokenKind.Identifier);

    const length =
      tokens[2] && isParenToken(tokens[2])
        ? tokens[2].tokens[0]?.value
        : undefined;
    const scale =
      tokens[2] && isParenToken(tokens[2])
        ? tokens[2].tokens[1]?.value
        : undefined;
    const column: SerializedNormalColumn = {
      hasReference: false,
      columnName,
      fieldName: this.normalizeFieldName(camelize(tokens[0].value)),
      type,
      notNull: isNotNull(),
      default: getDefaultValue(),
      zerofill: identifiers.some(it => it.value.toLowerCase() === 'zerofill'),
      signed: identifiers.some(it => it.value.toLowerCase() === 'unsigned')
        ? false
        : identifiers.some(it => it.value.toLowerCase() === 'signed')
          ? true
          : undefined,
      autoIncrement: tokens.some(it => it.kind === 'AUTO_INCREMENT'),
      length: length !== undefined ? +length : undefined,
      scale: scale !== undefined ? +scale : undefined,
      defaultCurrentTimeStamp,
      onUpdateCurrentTimeStamp: isOnUpdate(),
      option: defaultColumnOption,
    };

    // @ts-ignore
    if (column.default === '.nan' || Number.isNaN(column.default)) {
      console.error(column);
    }

    this.result.columns.push(column);
    if (tokens.some(it => it.kind === 'PRIMARY')) {
      this.result.primaryKey = [columnName];
    }
    if (tokens.some(it => it.kind === 'UNIQUE')) {
      this.result.uniqueKeys.push([columnName]);
    }
  }

  private parsePrimary(tokens: Tokens[]) {
    const keyIndex = tokens.findIndex(it => it.kind === 'KEY');
    const paren = tokens[keyIndex + 1] as ParenToken;
    this.result.primaryKey = paren.tokens
      .filter(it => it.kind !== TokenKind.Separator)
      .map(it => it.value);
  }

  private parseUnique(tokens: Tokens[]) {
    const paren = tokens.find(it => it.kind === 'Paren')! as ParenToken;
    this.result.uniqueKeys.push(
      paren.tokens
        .filter(it => it.kind !== TokenKind.Separator)
        .map(it => it.value),
    );
  }

  // TODO col_name(length) syntax
  private parseIndex(tokens: Tokens[]) {
    const paren = tokens.find(it => it.kind === 'Paren')! as ParenToken;
    this.result.indexes.push({
      constraintName: tokens[1].value,
      columns: paren.tokens
        .filter(it => it.kind !== TokenKind.Separator && it.kind !== 'Paren')
        .map(it => it.value),
    });
  }

  private parseFkey(tokens: Tokens[]) {
    const f = tokens.findIndex(it => it.kind === 'FOREIGN');
    const columnName = (tokens[f + 2] as ParenToken).tokens[0].value;
    const refIndex = tokens.findIndex(
      it => it.kind === 'REFERENCES' && it.value === 'REFERENCES',
    );
    const targetTable = tokens[refIndex + 1].value;
    const targetColumn = (tokens[refIndex + 2] as ParenToken).tokens[0].value;

    let onDelete = undefined;
    let onUpdate = undefined;
    const on = tokens
      .map((it, i) => (it.kind === 'ON' ? i : 0))
      .filter(it => it !== 0);
    on.forEach(it => {
      const action = () => {
        let name = tokens[it + 2].value.toUpperCase();
        if (name === 'SET' || name === 'NO') {
          name += tokens[it + 3].value.toUpperCase();
        }
        return name;
      };
      if (tokens[it + 1].kind === 'DELETE') {
        onDelete = action();
      }
      if (tokens[it + 1].kind === 'UPDATE') {
        onUpdate = action();
      }
    });

    const isColumnUnique = this.result.uniqueKeys
      .filter(it => it.length === 1)
      .find(it => it[0] === columnName);
    const sameTableRefs = this.result.columns.filter(
      it => it.hasReference && it.reference.parentTable === targetTable,
    );

    const reference: Reference = {
      parentTable: targetTable,
      parentColumn: targetColumn,
      columnName,
      relation: isColumnUnique ? 'OneOrZero' : 'Many',
      relationName:
        sameTableRefs.length !== 0
          ? targetTable + sameTableRefs.length
          : undefined,
      onUpdate,
      onDelete,
    };
    this.result.columns = this.result.columns.map(it =>
      it.columnName === columnName
        ? {
            ...it,
            hasReference: true,
            reference,
          }
        : it,
    );
  }

  private normalizeFieldName = (fieldName: string): string => {
    return /^[0-9].*/.test(fieldName) ? '_' + fieldName : fieldName;
  };

  private findIndex(kind: TokenKind, value: string, tokens: Token[]) {
    return tokens.findIndex(it => it.kind === kind && value === value);
  }

  private findEndOfParenIndex(
    tokens: Token[],
    startParenIndex: number,
  ): number {
    let opened = 1;
    for (let i = startParenIndex + 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.kind === 'separator') {
        if (token.value === ')') {
          opened -= 1;
          if (opened === 0) return i;
        } else if (token.value === '(') {
          opened += 1;
        }
      }
    }
    throw new Error('Closing Parenthesis Not Found');
  }
}
