export interface TsArg {
  name: string;
  type: string;
}

export enum TsAccessor {
  public = '',
  protected = 'protected',
  private = 'private',
}

export interface TsClassField {
  name: string;
  abstract?: boolean;
  accessor?: TsAccessor;
  readonly?: boolean;
  static?: boolean;
  type?: string;
  defaultValue: string;
}

export interface TsClassMethod {
  name: string;
  abstract?: boolean;
  accessor?: TsAccessor;
  async?: boolean;
  static?: boolean;
  args: TsArg[];
  returnType?: string;
  body: string;
}

export interface TsClassOption {
  abstract?: boolean;
  exportClass?: boolean;
  extends?: string;
}

export class TsClassGenerator {
  protected readonly fields: TsClassField[] = [];
  protected readonly methods: TsClassMethod[] = [];
  constructor(readonly className: string, protected readonly option: TsClassOption = { exportClass: true }) {}

  addField(...field: TsClassField[]) {
    this.fields.push(...field);
  }

  addMethod(...method: TsClassMethod[]) {
    this.methods.push(...method);
  }

  generate() {
    const classPrefix = [this.option.exportClass ? 'export' : '', this.option.abstract ? 'abstract' : '']
      .filter(it => it)
      .join(' ');
    const extend = this.option.extends ? ` extends ${this.option.extends}` : '';
    return `${classPrefix} class ${this.className}${extend} {
      ${this.fields.map(it => this.createField(it)).join('\n')}
      ${this.methods.map(it => this.createMethod(it)).join('\n')}
    }\n`;
  }

  protected createField(field: TsClassField): string {
    const fieldPrefix = [
      field.accessor,
      field.abstract ? 'abstract' : '',
      field.static ? 'static' : '',
      field.readonly ? 'readonly' : '',
    ]
      .filter(it => it)
      .join(' ');
    const type = field.type ? `: ${field.type}` : '';
    const defaultValue = field.defaultValue ? ` = ${field.defaultValue}` : '';
    return `${fieldPrefix} ${field.name}${type}${defaultValue};`;
  }

  protected createMethod(method: TsClassMethod): string {
    const methodPrefix = [
      method.accessor,
      method.abstract ? 'abstract' : '',
      method.static ? 'static' : '',
      method.async ? 'async' : '',
    ]
      .filter(it => it)
      .join(' ');
    const params = method.args.map(it => `${it.name}: ${it.type}`).join(',');
    const returnType = method.returnType ? `: ${method.returnType}` : '';
    return `${methodPrefix} ${method.name}(${params})${returnType} {${method.body}`;
  }
}
