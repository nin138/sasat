export enum TokenKind {
  String = 'string',
  Keyword = 'keyword',
  Identifier = 'identifier',
  Separator = 'separator',
  Number = 'number',
}

export type Token = {
  kind: TokenKind;
  value: string;
};

const noop = () => undefined;

export class Lexer {
  private readonly chars: string[];
  private index = 0;
  private tokens: Token[] = [];
  private hasNext = true;
  private stringLiteralInitializers = ['"', '`', "'"];
  // eslint-disable-next-line no-irregular-whitespace
  private whiteSpaces = /([ 　\t\n])/;
  private separators = ['(', ')', ','];
  constructor(str: string, private keywords: string[]) {
    this.chars = str.split('');
  }
  lex(): Token[] {
    while (this.hasNext) {
      this.skipWhiteSpace();
      if (this.findKeyWord()) continue;
      const char = this.read();

      if (/[0-9]/.test(char)) {
        this.readNumber(char);
        continue;
      }
      if (this.stringLiteralInitializers.includes(char)) {
        this.readStrLiteral(char);
        continue;
      }
      if (this.separators.includes(char)) {
        this.tokens.push({
          kind: TokenKind.Separator,
          value: char,
        });
        continue;
      }
      this.readIdentifier(char);
    }
    return this.tokens;
  }

  protected read(): string {
    const char = this.chars[this.index];
    this.index += 1;
    if (this.chars.length < this.index) this.hasNext = false;
    return char;
  }

  protected readIdentifier(startChar: string): void {
    let value = startChar;
    const pushToken = () =>
      this.tokens.push({
        kind: TokenKind.Identifier,
        value,
      });
    while (this.hasNext) {
      const char = this.read();
      if (this.whiteSpaces.test(char)) {
        pushToken();
        return;
      }
      if (this.separators.includes(char)) {
        pushToken();
        this.tokens.push({
          kind: TokenKind.Separator,
          value: char,
        });
        break;
      }
      value += char;
    }
  }

  protected readNumber(start: string): void {
    let literal = start;
    while (this.hasNext) {
      const char = this.read();
      if (this.whiteSpaces.test(char)) break;
      if (this.separators.includes(char)) break;
      literal += char;
    }
    this.index -= 1;
    if (!Number.isFinite(+literal)) {
      throw new Error('fail to read number ,position: ' + this.index);
    }
    this.tokens.push({
      kind: TokenKind.Number,
      value: literal,
    });
  }

  protected readStrLiteral(start: string): void {
    let literal = '';
    let isEscape = false;
    while (this.hasNext) {
      const current = this.read();
      if (!isEscape && current === start) {
        break;
      }
      literal += current;
      isEscape = !isEscape && current === '\\';
    }
    this.tokens.push({ kind: TokenKind.String, value: literal });
  }

  protected skipWhiteSpace(): void {
    while (this.hasNext && this.whiteSpaces.test(this.read())) {
      noop();
    }
    this.index -= 1;
  }

  protected findKeyWord(): boolean {
    const keyword = this.keywords.find(it => this.chars.slice(this.index, this.index + it.length).join('') === it);
    if (!keyword) return false;
    this.tokens.push({
      kind: TokenKind.Keyword,
      value: keyword,
    });
    this.index += keyword.length;
    return true;
  }
}
