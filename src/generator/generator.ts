import { IrEntity } from '../ir/entity';
import { IrRepository } from '../ir/repository';
import { IrGql } from '../ir/gql';
import { Ir } from '../ir/ir';
import { IrGqlContext } from '../ir/gql/context';

export interface CodeGenerator {
  readonly fileExt: string;
  generateEntity(entity: IrEntity): string;
  generateGeneratedRepository(repository: IrRepository): string;
  generateRepository(repository: IrRepository): string;
  generateGqlTypeDefs(gql: IrGql): string;
  generateGqlResolver(): string;
  generateGqlQuery(gql: IrGql): string;
  generateGqlMutation(gql: IrGql): string;
  generateGqlSubscription(gql: IrGql): string;
  generateGqlContext(contexts: IrGqlContext[]): string;
  generateOnceFiles(ir: Ir): Array<{ name: string; body: string }>;
}
