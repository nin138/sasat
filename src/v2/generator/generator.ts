import { IrEntity } from '../../ir/entity';
import { IrRepository } from '../../ir/repository';
import { IrGql } from '../../ir/gql';

export interface CodeGenerator {
  readonly fileExt: string;
  generateEntity(entity: IrEntity): string;
  generateGeneratedRepository(repository: IrRepository): string;
  generateRepository(repository: IrRepository): string;
  generateGqlTypeDefs(gql: IrGql): string;
  generateGqlResolver(): string;
  generateGqlQuery(gql: IrGql): string;
}
