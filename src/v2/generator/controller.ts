import { Ir } from '../ir/ir';
import { CodeGenerator } from './generator';
import { TsCodeGenerator } from './ts/generator';
import { config } from '../../config/config';
import * as path from 'path';
import { IrEntity } from '../ir/entity';
import { emptyDir, writeFile } from 'fs-extra';
import { mkDirIfNotExists } from '../../util/fsUtil';
import { IrRepository } from '../ir/repository';

export class CodeGenerateController {
  private codeGen: CodeGenerator = new TsCodeGenerator();
  private outDir = config().migration.out;
  private repositoryDir = path.join(this.outDir, 'repository');
  private generateDir = path.join(this.outDir, '__generated__');
  private generateEntityDir = path.join(this.generateDir, 'entity');
  private generateRepositoryDir = path.join(this.generateDir, 'repository');
  constructor(readonly ir: Ir) {}
  async generate() {
    await this.prepareDirs();
    await Promise.all([
      ...this.ir.entities.map(it => this.generateEntity(it)),
      ...this.ir.repositories.map(it => this.generateRepository(it)),
    ]);
  }

  private async prepareDirs() {
    mkDirIfNotExists(this.generateDir);
    await emptyDir(this.generateDir);
    mkDirIfNotExists(this.generateEntityDir);
    mkDirIfNotExists(this.generateRepositoryDir);
    mkDirIfNotExists(this.repositoryDir);
  }

  private getFullPath(basePath: string, entityName: string) {
    return path.join(basePath, `${entityName}.${this.codeGen.fileExt}`);
  }

  private generateEntity(ir: IrEntity) {
    return writeFile(this.getFullPath(this.generateEntityDir, ir.entityName), this.codeGen.generateEntity(ir));
  }

  private generateRepository(ir: IrRepository) {
    return writeFile(this.getFullPath(this.generateRepositoryDir, ir.entityName), this.codeGen.generateRepository(ir));
  }
}