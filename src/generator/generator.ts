import { IrRepository } from '../ir/repository';
import { IrGql } from '../ir/gql';
import { Ir } from '../ir/ir';
import { IrGqlContext } from '../ir/gql/context';
import { EntityNode } from '../node/entity';
import { RepositoryNode } from '../node/repository';
import { CodeGeneratable } from '../node/codeGeneratable';

export interface CodeGenerator {
  readonly fileExt: string;
  generateEntity(entity: EntityNode): string;
  generateGeneratedRepository(repository: RepositoryNode): string;
  generateRepository(repository: RepositoryNode): string;
  generateGqlTypeDefs(gql: IrGql): string;
  generateGqlResolver(gql: IrGql): string;
  generateGqlQuery(gql: IrGql): string;
  generateGqlMutation(gql: IrGql): string;
  generateGqlSubscription(gql: IrGql): string;
  generateGqlContext(contexts: IrGqlContext[]): string;
  generateOnceFiles(ir: CodeGeneratable): Array<{ name: string; body: string }>;
}
