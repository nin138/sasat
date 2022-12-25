import { TsCode } from './tsCode.js';

export abstract class TsStatement extends TsCode {
  private readonly codeType = 'statement';
}
