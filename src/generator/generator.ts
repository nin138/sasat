import { IrRepository } from '../ir/repository';
import { IrGql } from '../ir/gql';
import { Ir } from '../ir/ir';
import { IrGqlContext } from '../ir/gql/context';
import { EntityNode } from '../generatable/entity';
import { RepositoryNode } from '../generatable/repository';
import { CodeGeneratable } from '../generatable/codeGeneratable';

export interface CodeGenerator {
  readonly fileExt: string;
  generateEntity(entity: EntityNode): string;
  generateGeneratedRepository(repository: IrRepository): string;
  generateRepository(repository: IrRepository): string;
  generateGqlTypeDefs(gql: IrGql): string;
  generateGqlResolver(gql: IrGql): string;
  generateGqlQuery(gql: IrGql): string;
  generateGqlMutation(gql: IrGql): string;
  generateGqlSubscription(gql: IrGql): string;
  generateGqlContext(contexts: IrGqlContext[]): string;
  generateOnceFiles(ir: CodeGeneratable): Array<{ name: string; body: string }>;
}
