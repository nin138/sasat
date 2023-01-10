import { config } from '../config/config.js';
import * as path from 'path';
import fs from 'fs-extra';
import { mkDirIfNotExist, writeFileIfNotExist } from '../util/fsUtil.js';
import { RootNode } from './nodes/rootNode.js';
import { EntityNode } from './nodes/entityNode.js';
import { TsCodegen_v2 } from './codegen/tscodegen_v2.js';
import { DataStoreHandler } from '../migration/dataStore.js';
import { parse } from './parse.js';
import { Directory } from './directory.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileExistsSync } from 'tsconfig-paths/lib/filesystem';

const { emptyDir, writeFile } = fs;

export class CodeGen_v2 {
  private codeGen = new TsCodegen_v2();
  private outDir = config().migration.out;
  private dbDataSourceDir = path.join(
    this.outDir,
    Directory.paths.DATA_SOURCES,
  );
  private generateDir = path.join(this.outDir, Directory.paths.GENERATED);
  private generateEntityDir = path.join(this.outDir, Directory.paths.ENTITIES);
  private generateDbDataSourceDir = path.join(
    this.outDir,
    Directory.paths.GENERATED_DS,
  );
  private readonly root: RootNode;
  constructor(store: DataStoreHandler) {
    this.root = parse(store);
  }
  async generate(): Promise<void> {
    await this.prepareDirs();
    await Promise.all([
      ...this.root.entities.map(it => this.generateEntity(it)),
      ...this.root.entities.map(it => this.generateDatasource(it)),
      ...this.root.entities.map(it => this.generateGeneratedDatasource(it)),
      ...this.generateGql(this.root),
      ...this.generateFiles(this.root),
      ...this.generateOnceFiles(),
      this.generateCondition(this.root),
    ]);
  }

  private async prepareDirs() {
    mkDirIfNotExist(this.generateDir);
    await emptyDir(this.generateDir);
    mkDirIfNotExist(this.generateEntityDir);
    mkDirIfNotExist(this.generateDbDataSourceDir);
    mkDirIfNotExist(this.dbDataSourceDir);
  }

  private getFullPath(basePath: string, entityName: string) {
    return path.join(basePath, `${entityName}.${this.codeGen.fileExtension}`);
  }

  private generateEntity(node: EntityNode) {
    return writeFile(
      this.getFullPath(this.generateEntityDir, node.name.name),
      this.codeGen.generateEntity(node),
    );
  }

  private generateDatasource(node: EntityNode) {
    return writeFileIfNotExist(
      this.getFullPath(this.dbDataSourceDir, node.name.name),
      this.codeGen.generateDatasource(node),
    );
  }

  private generateGeneratedDatasource(node: EntityNode) {
    return writeFile(
      this.getFullPath(this.generateDbDataSourceDir, node.name.name),
      this.codeGen.generateGeneratedDatasource(node),
    );
  }

  private generateGql(rootNode: RootNode) {
    return [
      writeFile(
        this.getFullPath(this.generateDir, 'typeDefs'),
        this.codeGen.generateGqlTypeDefs(rootNode),
      ),
      writeFile(
        this.getFullPath(this.generateDir, 'resolver'),
        this.codeGen.generateGqlResolver(rootNode),
      ),
      writeFile(
        this.getFullPath(this.generateDir, 'query'),
        this.codeGen.generateGqlQuery(rootNode),
      ),
      writeFile(
        this.getFullPath(this.generateDir, 'mutation'),
        this.codeGen.generateGqlMutation(rootNode),
      ),
      writeFile(
        this.getFullPath(this.generateDir, 'subscription'),
        this.codeGen.generateGqlSubscription(rootNode),
      ),
      writeFile(
        this.getFullPath(this.generateDir, 'context'),
        this.codeGen.generateGQLContext(rootNode),
      ),
    ];
  }

  private generateFiles(rootNode: RootNode) {
    return this.codeGen
      .generateFiles(rootNode)
      .map(it =>
        writeFileIfNotExist(
          this.getFullPath(this.generateDir, it.name),
          it.body,
        ),
      );
  }

  private generateOnceFiles() {
    return this.codeGen
      .generateOnceFiles()
      .map(it =>
        writeFileIfNotExist(this.getFullPath(this.outDir, it.name), it.body),
      );
  }

  private async generateCondition(rootNode: RootNode) {
    const filePath = this.getFullPath(this.outDir, 'conditions');
    const content = fileExistsSync(filePath)
      ? readFileSync(filePath).toString()
      : '';
    const nextContent = this.codeGen.generateConditions(rootNode, content);
    if (nextContent) writeFileSync(filePath, nextContent);
  }
}
