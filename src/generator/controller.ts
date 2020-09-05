import { CodeGenerator } from './generator';
import { TsCodeGenerator } from './ts/generator';
import { config } from '../config/config';
import * as path from 'path';
import { emptyDir, writeFile } from 'fs-extra';
import { mkDirIfNotExist, writeFileIfNotExist } from '../util/fsUtil';
import { EntityNode } from '../node/entityNode';
import { RepositoryNode } from '../node/repositoryNode';
import { Directory } from '../constants/directory';
import { RootNode } from '../node/rootNode';

export class CodeGenerateController {
  private codeGen: CodeGenerator = new TsCodeGenerator();
  private outDir = config().migration.out;
  private repositoryDir = path.join(this.outDir, Directory.paths.dataSource);
  private generateDir = path.join(this.outDir, Directory.paths.generated);
  private generateEntityDir = path.join(this.outDir, Directory.paths.entity);
  private generateRepositoryDir = path.join(this.outDir, Directory.paths.generatedDataSource);
  constructor(readonly root: RootNode) {}
  async generate(): Promise<void> {
    await this.prepareDirs();
    await Promise.all([
      ...this.root.entities().map(it => this.generateEntity(it)),
      ...this.root.repositories.map(it => this.generateRepository(it)),
      ...this.root.repositories.map(it => this.generateGeneratedRepository(it)),
      ...this.generateGql(this.root),
      ...this.generateFiles(this.root),
      ...this.generateOnceFiles(this.root),
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

  private generateEntity(ir: EntityNode) {
    return writeFile(this.getFullPath(this.generateEntityDir, ir.entityName.name), this.codeGen.generateEntity(ir));
  }

  private generateRepository(ir: RepositoryNode) {
    return writeFileIfNotExist(
      this.getFullPath(this.repositoryDir, ir.entityName.name),
      this.codeGen.generateRepository(ir),
    );
  }

  private generateGeneratedRepository(ir: RepositoryNode) {
    return writeFile(
      this.getFullPath(this.generateRepositoryDir, ir.entityName.name),
      this.codeGen.generateGeneratedRepository(ir),
    );
  }

  private generateGql(rootNode: RootNode) {
    return [
      writeFile(this.getFullPath(this.generateDir, 'typeDefs'), this.codeGen.generateGqlTypeDefs(rootNode)),
      writeFile(this.getFullPath(this.generateDir, 'resolver'), this.codeGen.generateGqlResolver(rootNode)),
      writeFile(this.getFullPath(this.generateDir, 'query'), this.codeGen.generateGqlQuery(rootNode)),
      writeFile(this.getFullPath(this.generateDir, 'mutation'), this.codeGen.generateGqlMutation(rootNode)),
      writeFile(this.getFullPath(this.generateDir, 'subscription'), this.codeGen.generateGqlSubscription(rootNode)),
      writeFile(this.getFullPath(this.generateDir, 'context'), this.codeGen.generateGqlContext(rootNode)),
    ];
  }

  private generateFiles(rootNode: RootNode) {
    return this.codeGen
      .generateFiles(rootNode)
      .map(it => writeFileIfNotExist(this.getFullPath(this.generateDir, it.name), it.body));
  }

  private generateOnceFiles(rootNode: RootNode) {
    return this.codeGen
      .generateOnceFiles(rootNode)
      .map(it => writeFileIfNotExist(this.getFullPath(this.outDir, it.name), it.body));
  }
}
