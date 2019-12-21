import { IrEntity } from '../../../ir/entity';
import { generateEntityFileString } from './entity';
import { IrRepository } from '../../../ir/repository';
import { generateGeneratedRepositoryString } from './generatedRepository';
import { CodeGenerator } from '../generator';
import * as prettier from 'prettier';
import { generateRepositoryString } from './repository';

export class TsCodeGenerator implements CodeGenerator {
  readonly fileExt = 'ts';

  private formatCode(code: string) {
    return prettier.format(code, { parser: 'typescript' });
  }

  generateEntity(entity: IrEntity): string {
    return this.formatCode(generateEntityFileString(entity));
  }

  generateGeneratedRepository(repository: IrRepository): string {
    return this.formatCode(generateGeneratedRepositoryString(repository));
  }

  generateRepository(repository: IrRepository): string {
    return this.formatCode(generateRepositoryString(repository));
  }
}
