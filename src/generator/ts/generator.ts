import { IrEntity } from '../../ir/entity';
import { generateEntityFileString } from './file/entity';
import { IrRepository } from '../../ir/repository';
import { TsGeneratorGeneratedRepository } from './file/generatedRepository';
import { CodeGenerator } from '../generator';
import * as prettier from 'prettier';
import { generateRepositoryString } from './file/repository';
import { IrGql } from '../../ir/gql';
import { generateTsTypeDefString } from './gql/typeDef';
import { generateTsResolverString } from './gql/resolver';
import { generateTsGqlQueryString } from './gql/query';
import { generateTsGqlMutationString } from './gql/mutation';
import { generateTsGqlSubscriptionString } from './gql/subscription';

export class TsCodeGenerator implements CodeGenerator {
  readonly fileExt = 'ts';

  private formatCode(code: string) {
    return prettier.format(code, { parser: 'typescript' });
  }

  generateEntity(entity: IrEntity): string {
    return this.formatCode(generateEntityFileString(entity));
  }

  generateGeneratedRepository(repository: IrRepository): string {
    return this.formatCode(new TsGeneratorGeneratedRepository(repository).generate());
  }

  generateRepository(repository: IrRepository): string {
    return this.formatCode(generateRepositoryString(repository));
  }

  generateGqlTypeDefs(gql: IrGql): string {
    return generateTsTypeDefString(gql);
  }

  generateGqlQuery(gql: IrGql): string {
    return this.formatCode(generateTsGqlQueryString(gql));
  }

  generateGqlResolver(): string {
    return generateTsResolverString();
  }

  generateGqlMutation(gql: IrGql): string {
    return this.formatCode(generateTsGqlMutationString(gql));
  }

  generateGqlSubscription(gql: IrGql): string {
    return this.formatCode(generateTsGqlSubscriptionString(gql.mutations));
  }
}
