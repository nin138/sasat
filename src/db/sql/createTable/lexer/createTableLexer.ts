import { createSimpleLexer } from './createSimpleLexer.js';
import { Lexer2 } from './lexer2.js';

const separators = ['(', ')', ','];
const keywords = [
  'CREATE',
  'TABLE',
  'PRIMARY',
  'KEY',
  'UNIQUE',
  'FOREIGN',
  'NOT',
  'NULL',
  'DEFAULT',
  'AUTO_INCREMENT',
  'ON',
  'UPDATE',
  'DELETE',
  'REFERENCES',
  'CONSTRAINT',
].map(it => ({ kind: it, value: it }));

export const createTableLexer = (str: string): Lexer2 => {
  return createSimpleLexer(str, keywords, true, separators, ['=']);
};
