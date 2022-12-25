import { DBColumnTypes } from '../../migration/column/columnTypes.js';

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
      entity: false;
      dbType: DBColumnTypes;
    }
  | {
      entity: true;
    }
);
