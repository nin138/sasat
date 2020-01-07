import { TsFileGenerator } from '../tsFileGenerator';
import { IrGqlContext } from '../../../ir/gql/context';
import { columnTypeToTsType } from '../../../migration/column/columnTypes';

export class TsGeneratorGqlContext extends TsFileGenerator {
  constructor(contexts: IrGqlContext[]) {
    super();
    this.addLine('export interface BaseGqlContext {');
    contexts.forEach(it => {
      this.addLine(`${it.name}: ${columnTypeToTsType(it.type)}`);
    });
    this.addLine('}');
  }
}
