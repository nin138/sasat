import { IrEntity } from '../../ir/entity';
import { generateEntityFileString } from './entity';
import { IrRepository } from '../../ir/repository';
import { generateRepositoryString } from './repository';
import { CodeGenerator } from '../generator';

export class TsCodeGenerator implements CodeGenerator {
  readonly fileExt = 'ts';

  generateEntity(entity: IrEntity): string {
    return generateEntityFileString(entity);
  }

  generateRepository(repository: IrRepository): string {
    return generateRepositoryString(repository);
  }
}
