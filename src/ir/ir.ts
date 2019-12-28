import { IrEntity } from './entity';
import { IrRepository } from './repository';

export interface Ir {
  entities: IrEntity[];
  repositories: IrRepository[];
}
