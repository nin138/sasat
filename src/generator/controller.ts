import { Ir } from '../ir/ir';
import { CodeGenerator } from './generator';
import { TsCodeGenerator } from './ts/generator';
import { config } from '../config/config';
import * as path from 'path';
import { IrEntity } from '../ir/entity';
import { emptyDir, writeFile } from 'fs-extra';
import { mkDirIfNotExist, writeFileIfNotExist } from '../util/fsUtil';
import { IrRepository } from '../ir/repository';
import { IrGql } from '../ir/gql';

export class CodeGenerateController {
  private codeGen: CodeGenerator = new TsCodeGenerator();
  private outDir = config().migration.out;
  private repositoryDir = path.join(this.outDir, 'repository');
  private generateDir = path.join(this.outDir, '__generated__');
  private generateEntityDir = path.join(this.generateDir, 'entity');
  private generateRepositoryDir = path.join(this.generateDir, 'repository');
  constructor(readonly ir: Ir, readonly gql: IrGql) {}
  async generate() {
    await this.prepareDirs();
    await Promise.all([
      ...this.ir.entities.map(it => this.generateEntity(it)),
      ...this.ir.repositories.map(it => this.generateRepository(it)),
      ...this.ir.repositories.map(it => this.generateGeneratedRepository(it)),
      ...this.generateGql(this.gql),
      ...this.generateOnceFiles(this.ir),
    ]);
  }

  private async prepareDirs() {
    mkDirIfNotExist(this.generateDir);
    await emptyDir(this.generateDir);
    mkDirIfNotExist(this.generateEntityDir);
    mkDirIfNotExist(this.generateRepositoryDir);
    mkDirIfNotExist(this.repositoryDir);
  }

  private getFullPath(basePath: string, entityName: string) {
    return path.join(basePath, `${entityName}.${this.codeGen.fileExt}`);
  }

  private generateEntity(ir: IrEntity) {
    return writeFile(this.getFullPath(this.generateEntityDir, ir.entityName), this.codeGen.generateEntity(ir));
  }

  private generateRepository(ir: IrRepository) {
    return writeFileIfNotExist(
      this.getFullPath(this.repositoryDir, ir.entityName),
      this.codeGen.generateRepository(ir),
    );
  }

  private generateGeneratedRepository(ir: IrRepository) {
    return writeFile(
      this.getFullPath(this.generateRepositoryDir, ir.entityName),
      this.codeGen.generateGeneratedRepository(ir),
    );
  }

  private generateGql(ir: IrGql) {
    return [
      writeFile(this.getFullPath(this.generateDir, 'typeDefs'), this.codeGen.generateGqlTypeDefs(ir)),
      writeFile(this.getFullPath(this.generateDir, 'resolver'), this.codeGen.generateGqlResolver()),
      writeFile(this.getFullPath(this.generateDir, 'query'), this.codeGen.generateGqlQuery(ir)),
      writeFile(this.getFullPath(this.generateDir, 'mutation'), this.codeGen.generateGqlMutation(ir)),
      writeFile(this.getFullPath(this.generateDir, 'subscription'), this.codeGen.generateGqlSubscription(ir)),
      writeFile(this.getFullPath(this.generateDir, 'context'), this.codeGen.generateGqlContext(ir.contexts)),
    ];
  }

  private generateOnceFiles(ir: Ir) {
    return this.codeGen
      .generateOnceFiles(ir)
      .map(it => writeFileIfNotExist(this.getFullPath(this.outDir, it.name), it.body));
  }
}
