import { Token, TokenKind } from './lexer.js';

export type Terminator = 'separator' | 'whitespace' | 'operator';

export type Rule = {
  start: RegExp;
  terminator: Terminator[];
  fn: (char: string, next: () => { hasNext: boolean; value: string; terminated: boolean }) => Token | undefined;
};

const createStringLiteralRule = (literalInitializer: RegExp): Rule => {
  return {
    start: literalInitializer,
    terminator: [],
    fn: (start, next) => {
      let literal = '';
      let isEscape = false;
      let v;
      do {
        v = next();
        if (!isEscape && v.value === start) {
          return { kind: TokenKind.String, value: literal };
        }
        literal += v.value;
        isEscape = !isEscape && v.value === '\\';
      } while (v.hasNext);
      throw new Error('Non Terminated String');
    },
  };
};

const numberLiteral: Rule = {
  start: /[0-9]/,
  terminator: ['separator', 'whitespace', 'operator'],
  fn: (start, next) => {
    let literal = start;
    let v;
    do {
      v = next();
      if (v.terminated) break;
      literal += v.value;
    } while (v.hasNext);
    if (!Number.isFinite(+literal)) {
      throw new Error('fail to read number');
    }
    return {
      kind: TokenKind.Number,
      value: literal,
    };
  },
};

export type Keyword = {
  value: string;
  kind: string;
};
const createKeywordRule = (keywords: (Keyword | string)[], ignoreCase = false): Rule => {
  return {
    start: /./,
    terminator: ['whitespace', 'separator'],
    fn: (start, next) => {
      let str = ignoreCase ? start.toUpperCase() : start;
      let words = keywords.map(it =>
        typeof it === 'string' ? { kind: TokenKind.Keyword, value: it } : { ...it, value: it.value },
      );
      if (ignoreCase) words = words.map(it => ({ ...it, value: it.value.toUpperCase() }));
      let v;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        v = next();
        if (v.terminated && words.find(it => it.value === str)) {
          return {
            kind: words.find(it => it.value === str)!.kind,
            value: str,
          };
        }
        str += ignoreCase ? v.value.toUpperCase() : v.value;
        words = words.filter(it => it.value.startsWith(str));
        if (words.length === 0) return;
      }
    },
  };
};

const identifier: Rule = {
  start: /[^0-9]/,
  terminator: ['separator', 'whitespace', 'operator'],
  fn: (start, next) => {
    let value = start;
    let v;
    do {
      v = next();
      if (v.terminated) break;
      value += v.value;
    } while (v.hasNext);
    return {
      kind: TokenKind.Identifier,
      value,
    };
  },
};

export const Rules = {
  createStringLiteralRule,
  numberLiteral,
  createKeywordRule,
  identifier,
};
