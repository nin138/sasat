import { Token, TokenKind } from './lexer';
import { Rule, Terminator } from './rules';

type Current = {
  hasNext: boolean;
  value: string;
};

export class Lexer2 {
  private readonly chars: string[];
  private index = 0;
  private tokens: Token[] = [];
  constructor(
    str: string,
    protected readonly rules: Rule[],
    protected readonly separators: string[],
    protected readonly operators: string[],
    protected readonly whiteSpaces = /([ \t\n])/,
  ) {
    this.chars = str.split('');
  }

  private isTerminated(value: string, terminators: Terminator[]) {
    const separator = (value: string) => this.separators.includes(value);
    const operator = (value: string) => this.operators.some(it => it.startsWith(value));
    const whiteSpace = (value: string) => this.whiteSpaces.test(value);
    return terminators.some(it => {
      switch (it) {
        case 'operator':
          return operator(value);
        case 'separator':
          return separator(value);
        case 'whitespace':
          return whiteSpace(value);
      }
    });
  }

  lex(): Token[] {
    let value = this.read();
    do {
      value = this.exec(value);
    } while (value.hasNext);
    return this.tokens;
  }

  private findOperator(current: Current): Token | undefined {
    const operator = (value: string) => ({ kind: TokenKind.Operator, value });
    if (!current.hasNext) {
      return this.operators.includes(current.value) ? operator(current.value) : undefined;
    }
    let operators = this.operators.filter(it => it.startsWith(current.value));
    let state = current.value;
    if (operators.length === 1) return operator(state);
    while (operators.length !== 0) {
      if (!current.hasNext) return operator(state);
      current = this.read();
      state += current.value;
      operators = operators.filter(it => it.startsWith(state));
      if (operators.length === 1) return operator(state);
    }
    if (state.length > 1) {
      return operator(state.slice(0, -1));
    }
    return;
  }

  private exec(current: Current): Current {
    const currentIndex = this.index;
    if (this.whiteSpaces.test(current.value)) {
      return this.read();
    }
    if (this.separators.includes(current.value)) {
      this.tokens.push({
        kind: TokenKind.Separator,
        value: current.value,
      });
      return this.read();
    }
    const op = this.findOperator(current);
    if (op) {
      this.tokens.push(op);
      this.index = currentIndex + op.value.length - 1;
      return this.read();
    }
    this.index = currentIndex;
    for (let i = 0; i < this.rules.length; i++) {
      const rule = this.rules[i];
      if (!rule.start.test(current.value)) continue;
      let terminated = false;
      let value: Current | undefined = undefined;
      const next = () => {
        value = this.read();
        terminated = this.isTerminated(value.value, rule.terminator);
        return {
          terminated,
          ...value,
        };
      };
      const result = rule.fn(current.value, next);
      if (!result) {
        this.index = currentIndex;
        continue;
      }
      this.tokens.push(result);
      if (terminated && value) return value;
      return this.read();
    }
    throw new Error('No Rule Matched');
  }

  protected read(): Current {
    const char = this.chars[this.index] || '';
    this.index += 1;
    return {
      hasNext: this.chars.length > this.index,
      value: char,
    };
  }
}
