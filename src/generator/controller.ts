import * as path from 'path';
import { config } from '../config/config';
import { mkDirIfNotExists, writeYmlFile } from '../util';
import { TableInfo } from '../migration/table/tableInfo';
import { writeEntity } from './entity/entity';
import { writeRepository } from './repository/repository';
import { emptyDir } from 'fs-extra';

export class GenerateController {
  private outDir = config().migration.out;
  private repositoryDir = path.join(this.outDir, 'repository');
  private generateDir = path.join(this.outDir, '__generated');
  private generateEntityDir = path.join(this.generateDir, 'entity');
  private generateRepositoryDir = path.join(this.generateDir, 'repository');

  constructor(private tables: TableInfo[]) {}

  async execute() {
    await this.prepareDirs();
    writeYmlFile(this.outDir, 'current_schema.yml', this.tables);
    for (const table of this.tables) {
      await this.generate(table);
    }
  }

  private async prepareDirs() {
    mkDirIfNotExists(this.generateDir);
    await emptyDir(this.generateDir);
    mkDirIfNotExists(this.generateEntityDir);
    mkDirIfNotExists(this.generateRepositoryDir);
    mkDirIfNotExists(this.repositoryDir);
  }

  private async generate(table: TableInfo) {
    await writeEntity(table, this.generateEntityDir);
    await writeRepository(table, this.generateRepositoryDir, this.repositoryDir);
  }
}
