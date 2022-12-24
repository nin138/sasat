import { DBColumnTypes } from '../../migration/column/columnTypes.js';

export type QueryNode = {
  queryName: string;
  returnType: TypeNode;
  args: ArgNode[];
  pageable: boolean;
};

export type ArgNode = {
  name: string;
  type: TypeNode;
};

export type TypeNode = {
  typeName: string;
  nullable: boolean;
  array: boolean;
} & (
  | {
      isEntity: false;
      dbType: DBColumnTypes;
    }
  | {
      isEntity: true;
    }
);
