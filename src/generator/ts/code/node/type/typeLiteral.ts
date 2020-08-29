import { TsCode } from '../../abstruct/tsCode';
import { PropertySignature } from '../propertySignature';
import { TsType } from './type';

export class TypeLiteral extends TsCode {
  constructor(private properties: PropertySignature[] = []) {
    super();
    this.mergeImport(...properties);
  }

  addProperty(propertyName: string, type: TsType, isOptional = false, isReadOnly = false): this {
    this.properties.push(new PropertySignature(propertyName, type, isOptional, isReadOnly));
    return this;
  }

  protected toTsString(): string {
    return `{${this.properties.map(it => it.toString()).join(';')}}`;
  }
}
