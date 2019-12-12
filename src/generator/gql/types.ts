export interface GqlSchema {
  types: GqlType[];
  queries: GqlQuery[];
  mutations: GqlMutation[];
}

export interface GqlType {
  typeName: string;
  fields: GqlField[];
}

export interface GqlField {
  name: string;
  type: GqlPrimitive;
  nullable: boolean;
}

export enum GqlPrimitive {
  Int = 'Int',
  Float = 'Float',
  String = 'String',
  Boolean = 'Boolean',
  ID = 'ID',
}

export class GqlPrimitiveType {
  constructor(readonly type: GqlPrimitive, public nullable: boolean) {}
  toString() {
    return this.type + (this.nullable ? '' : '!');
  }
}

export interface GqlQuery {
  name: string;
  params: Array<{ name: string; type: GqlPrimitive }>;
  returnType: string;
}

export class GqlParam {
  type: GqlPrimitiveType;
  constructor(public name: string, type: GqlPrimitive, nullable: boolean) {
    this.type = new GqlPrimitiveType(type, nullable);
  }
  toString() {
    return `${this.name}: ${this.type.toString()}`;
  }
  toNullableString() {
    return `${this.name}: ${this.type.type}`;
  }
}

export interface GqlMutation {
  modelName: string;
  creatable: GqlParam[];
  pKeys: GqlParam[];
  updatable: GqlParam[];
}
