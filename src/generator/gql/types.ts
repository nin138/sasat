export interface GqlSchema {
  types: GqlType[];
  queries: GqlQuery[];
  mutation: GqlMutation[];
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

export interface GqlQuery {
  name: string;
  params: Array<{ name: string; type: string }>;
  returnType: string;
}

export type GqlMutation = GqlQuery;
