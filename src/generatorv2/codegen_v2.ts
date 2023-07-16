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
import { tsFileNames } from './codegen/ts/tsFileNames.js';

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
      this.generateGql(this.root),
      this.generateFiles(this.root),
      ...this.generateOnceFiles(),
      this.generateCondition(this.root),
      this.generateIDEncoders(this.root),
      this.generateMiddleware(this.root),
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

  private async generateEntity(node: EntityNode) {
    return writeFile(
      this.getFullPath(this.generateEntityDir, node.name.name),
      await this.codeGen.generateEntity(node),
    );
  }

  private async generateDatasource(node: EntityNode) {
    return writeFileIfNotExist(
      this.getFullPath(this.dbDataSourceDir, node.name.name),
      await this.codeGen.generateDatasource(node),
    );
  }

  private async generateGeneratedDatasource(node: EntityNode) {
    return writeFile(
      this.getFullPath(this.generateDbDataSourceDir, node.name.name),
      await this.codeGen.generateGeneratedDatasource(node),
    );
  }

  private async generateGql(rootNode: RootNode): Promise<void[]> {
    return Promise.all([
      writeFile(
        this.getFullPath(this.generateDir, 'typeDefs'),
        await this.codeGen.generateGqlTypeDefs(rootNode),
      ),
      writeFile(
        this.getFullPath(this.generateDir, 'resolver'),
        await this.codeGen.generateGqlResolver(rootNode),
      ),
      writeFile(
        this.getFullPath(this.generateDir, 'query'),
        await this.codeGen.generateGqlQuery(rootNode),
      ),
      writeFile(
        this.getFullPath(this.generateDir, 'mutation'),
        await this.codeGen.generateGqlMutation(rootNode),
      ),
      writeFile(
        this.getFullPath(this.generateDir, 'subscription'),
        await this.codeGen.generateGqlSubscription(rootNode),
      ),
      writeFile(
        this.getFullPath(this.generateDir, 'context'),
        await this.codeGen.generateGQLContext(rootNode),
      ),
    ]);
  }

  private async generateFiles(rootNode: RootNode): Promise<void[]> {
    const files = await this.codeGen.generateFiles(rootNode);
    return Promise.all(
      files.map(it =>
        writeFileIfNotExist(
          this.getFullPath(this.generateDir, it.name),
          it.body,
        ),
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
    const filePath = this.getFullPath(this.outDir, tsFileNames.conditions);
    const content = fs.existsSync(filePath)
      ? fs.readFileSync(filePath).toString()
      : '';
    const nextContent = this.codeGen.generateConditions(rootNode, content);
    if (nextContent) fs.writeFileSync(filePath, nextContent);
  }

  private async generateIDEncoders(rootNode: RootNode) {
    const filePath = this.getFullPath(this.outDir, tsFileNames.encoder);
    const content = fs.existsSync(filePath)
      ? fs.readFileSync(filePath).toString()
      : '';
    const nextContent = this.codeGen.generateIDEncoders(rootNode, content);
    if (nextContent) fs.writeFileSync(filePath, nextContent);
  }

  private async generateMiddleware(rootNode: RootNode) {
    const filePath = this.getFullPath(this.outDir, tsFileNames.middleware);
    const content = fs.existsSync(filePath)
      ? fs.readFileSync(filePath).toString()
      : '';
    const nextContent = this.codeGen.generateMiddlewares(rootNode, content);
    if (nextContent) fs.writeFileSync(filePath, nextContent);
  }
}
