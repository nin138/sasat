import { CallExpression } from './callExpression';

export class NewExpression extends CallExpression {
  protected toTsString(): string {
    return 'new ' + super.toString();
  }
}
