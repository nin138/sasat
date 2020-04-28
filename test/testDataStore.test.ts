import { DataStoreHandler } from '../src/entity/dataStore';
import { MigrationReader } from '../src/migration/migrationReader';

export const testStoreHandler = new DataStoreHandler(new MigrationReader().read().serialize());
