import { TsCode } from './tsCode';

export abstract class TsStatement extends TsCode {
  private readonly codeType = 'statement';
}
