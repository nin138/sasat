import * as path from 'path';
import { config } from '../config/config';
import { mkDirIfNotExists, writeYmlFile } from '../util/fsUtil';
import { writeEntity } from './entity/entity';
import { writeRepository } from './repository/repository';
import { emptyDir, writeFile } from 'fs-extra';
import { generateGqlString } from './gql/gql';
import { DataStoreSchema } from '../migration/table/dataStoreSchema';
import { StoreGenerator, TableGenerator } from './store';

export class GenerateController {
  private outDir = config().migration.out;
  private repositoryDir = path.join(this.outDir, 'repository');
  private generateDir = path.join(this.outDir, '__generated');
  private generateEntityDir = path.join(this.generateDir, 'entity');
  private generateRepositoryDir = path.join(this.generateDir, 'repository');

  private store: StoreGenerator;
  constructor(private schema: DataStoreSchema) {
    this.store = new StoreGenerator(schema);
  }

  async execute() {
    await this.prepareDirs();
    writeYmlFile(this.outDir, 'current_schema.yml', this.schema.tables);
    await Promise.all(this.store.tables.map(this.generate));
    const gqlStrings = generateGqlString(this.store.tables);
    await writeFile(path.join(this.generateDir, 'typeDefs.ts'), gqlStrings.typeDefs);
    await writeFile(path.join(this.generateDir, 'query.ts'), gqlStrings.query);
    await writeFile(path.join(this.generateDir, 'resolver.ts'), gqlStrings.resolver);
  }

  private async prepareDirs() {
    mkDirIfNotExists(this.generateDir);
    await emptyDir(this.generateDir);
    mkDirIfNotExists(this.generateEntityDir);
    mkDirIfNotExists(this.generateRepositoryDir);
    mkDirIfNotExists(this.repositoryDir);
  }

  private generate = async (table: TableGenerator) => {
    await writeEntity(table, this.generateEntityDir);
    await writeRepository(table, this.generateRepositoryDir, this.repositoryDir);
  };
}
