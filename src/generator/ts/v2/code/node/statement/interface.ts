import { PropertySignature } from '../propertySignature';
import { TsStatement } from '../../statement';
import { TsUtil } from '../../tsUtil';

export class TsInterface extends TsStatement {
  private isExported = false;
  private properties: PropertySignature[] = [];
  constructor(private readonly name: string) {
    super();
  }
  export(): this {
    this.isExported = true;
    return this;
  }
  addProperty(
    propertyName: string,
    type: string,
    isOptional = false,
    isReadOnly = false,
  ): this {
    this.properties.push(
      new PropertySignature(propertyName, type, isOptional, isReadOnly),
    );
    return this;
  }

  addProperties(properties: PropertySignature[]): this {
    this.properties.push(...properties);
    this.mergeImport(...properties);
    return this;
  }

  toTsString(): string {
    return `${TsUtil.export(
      this.isExported,
    )}interface {${this.properties.map(it => it.toTsString()).join(';')}}`;
  }
}
