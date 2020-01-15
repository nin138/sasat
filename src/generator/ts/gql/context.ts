import { TsFileGenerator } from '../tsFileGenerator';
import { IrGqlContext } from '../../../ir/gql/context';
import { columnTypeToTsType } from '../../../migration/column/columnTypes';
import { TsCodeGenObject } from '../code/object';

export class TsGeneratorGqlContext extends TsFileGenerator {
  constructor(contexts: IrGqlContext[]) {
    super();
    this.addLine('export interface BaseGqlContext');
    const context = new TsCodeGenObject();
    contexts.forEach(it => {
      context.set(it.name, columnTypeToTsType(it.type));
    });
    this.addLine(context.toTsString());
  }
}
