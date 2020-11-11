import { Column } from '../serializable/column';
import { BooleanValueExpression } from 'sasat';

export type DomainObjectDefinition = {
  domainName: string;
  identifiable: Column[];
  fields: Record<string, DomainObjectFieldDefinition>;
};

export type DomainObjectFieldDefinition = DomainObjectNestedFieldDefinition | DomainObjectColumnFieldDefinition;

type DomainObjectNestedFieldDefinition = {
  isArray: boolean;
  nullable: boolean;
  domain: DomainObjectDefinition;
  onExpr: BooleanValueExpression;
};

type DomainObjectColumnFieldDefinition =
  | {
      column: Column;
      onExpr: BooleanValueExpression;
    }
  | {
      column: Column;
      relationName: string;
    };
