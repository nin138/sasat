import { GqlPrimitive } from '../../generator/gql/types';

export interface IrGqlType {
  typeName: string;
  params: IrGqlParam[];
}

export interface IrGqlParam {
  name: string;
  type: GqlPrimitive | string;
  isNullable: boolean;
  isArray: boolean;
  isReference?: boolean;
}
