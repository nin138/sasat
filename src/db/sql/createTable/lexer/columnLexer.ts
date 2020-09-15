import { Lexer, Token } from './lexer';

const keywords = [
  'NOT NULL',
  'DEFAULT',
  'ON UPDATE',
  'ON DELETE',
  'RESTRICT',
  'CASCADE',
  'SET NULL',
  'NO ACTION',
  'AUTO_INCREMENT',
  'unsigned',
  'signed',
  'zerofill',
  'CREATE TABLE',
  'UNIQUE KEY',
  'REFERENCES',
  'NULL',
];

export const lexColumn = (str: string): Token[] => new Lexer(str, keywords).lex();
