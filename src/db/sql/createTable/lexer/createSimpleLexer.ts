import { Lexer2 } from './lexer2.js';
import { Keyword, Rules } from './rules.js';

export const createSimpleLexer = (
  str: string,
  keywords: (Keyword | string)[],
  ignoreKeywordCase: boolean,
  separators: string[],
  operators: string[] = [],
): Lexer2 =>
  new Lexer2(
    str,
    [
      Rules.createStringLiteralRule(/['"`]/),
      Rules.numberLiteral,
      Rules.createKeywordRule(keywords, ignoreKeywordCase),
      Rules.identifier,
    ],
    separators,
    operators,
  );
