import { IrEntity } from '../../ir/entity';
import { generateEntityFileString } from './file/entity';
import { IrRepository } from '../../ir/repository';
import { TsGeneratorGeneratedRepository } from './file/generatedRepository';
import { CodeGenerator } from '../generator';
import * as prettier from 'prettier';
import { generateRepositoryString } from './file/repository';
import { IrGql } from '../../ir/gql';
import { generateTsTypeDefString } from './gql/typeDef';
import { generateTsGqlQueryString } from './gql/query';
import { TsCodeGeneratorGqlMutation } from './gql/mutation';
import { IrGqlContext } from '../../ir/gql/context';
import { TsGeneratorGqlContext } from './gql/context';
import { TsGeneratorGqlResolver } from './gql/resolver';
import { TsGeneratorGqlSubscription } from './gql/subscription';

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

  generateGqlResolver(gql: IrGql): string {
    return this.formatCode(new TsGeneratorGqlResolver(gql.resolvers).generate());
  }

  generateGqlMutation(gql: IrGql): string {
    return this.formatCode(new TsCodeGeneratorGqlMutation(gql).generate());
  }

  generateGqlSubscription(gql: IrGql): string {
    return this.formatCode(new TsGeneratorGqlSubscription(gql.mutations).generate());
  }

  generateGqlContext(contexts: IrGqlContext[]): string {
    return this.formatCode(new TsGeneratorGqlContext(contexts).generate());
  }

  generateOnceFiles(): Array<{ name: string; body: string }> {
    const contextFile = `\
import { BaseGqlContext } from './__generated__/context';
export interface GqlContext extends BaseGqlContext {}
`;
    return [
      {
        name: 'context',
        body: contextFile,
      },
    ];
  }
}
