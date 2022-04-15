import { TsCode } from '../../abstruct/tsCode.js';
import { pickCode, TsType } from './type.js';
import { Identifier } from '../expressions.js';

export class TypeReference extends TsCode {
  constructor(private readonly typeName: string, private readonly typeArguments: Array<Identifier | TsType> = []) {
    super();
    this.mergeImport(...pickCode(typeArguments));
  }

  importFrom(path: string): this {
    this.addImport([this.typeName], path);
    return this;
  }

  partial(): TypeReference {
    return new TypeReference('Partial', [this]);
  }

  pick(...properties: string[]): TypeReference {
    return new TypeReference('Pick', [this, new Identifier(properties.map(it => `'${it}'`).join('|'))]);
  }

  protected toTsString(): string {
    const typeArgs = this.typeArguments.length === 0 ? '' : `<${this.typeArguments.join(',')}>`;
    return `${this.typeName}${typeArgs}`;
  }
}
