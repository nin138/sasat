import { Lexer, Token } from './lexer';

const keywords = ['NOT NULL', 'DEFAULT', 'ON UPDATE', 'ON DELETE', 'AUTO_INCREMENT', 'unsigned', 'signed', 'zerofill'];

export const lexColumn = (str: string): Token[] => new Lexer(str, keywords).lex();
