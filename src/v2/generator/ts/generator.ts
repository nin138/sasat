import { IrEntity } from '../../ir/entity';
import { generateEntityFileString } from './entity';
import { IrRepository } from '../../ir/repository';
import { generateRepositoryString } from './repository';
import { CodeGenerator } from '../generator';
import * as prettier from 'prettier';

export class TsCodeGenerator implements CodeGenerator {
  readonly fileExt = 'ts';

  private formatCode(code: string) {
    return prettier.format(code, { parser: 'typescript' });
  }

  generateEntity(entity: IrEntity): string {
    return this.formatCode(generateEntityFileString(entity));
  }

  generateRepository(repository: IrRepository): string {
    return this.formatCode(generateRepositoryString(repository));
  }
}
