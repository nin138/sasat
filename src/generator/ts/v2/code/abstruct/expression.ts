import { TsCode } from './tsCode';
import { ExpressionStatement } from '../node/ExpressionStatement';

export abstract class TsExpression extends TsCode {
  private readonly codeType = 'expression';

  toStatement() {
    return new ExpressionStatement(this);
  }
}
