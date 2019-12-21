import { IrEntity } from '../ir/entity';
import { IrRepository } from '../ir/repository';

export interface CodeGenerator {
  readonly fileExt: string;
  generateEntity(entity: IrEntity): string;
  generateRepository(repository: IrRepository): string;
}
