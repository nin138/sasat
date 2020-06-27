import { SasatMigration } from '../../src';
import { MigrationStore } from '../../src';

export class CreateUser implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    store.createTable('user', table => {
      table.column('userId').int().primary().unsigned().autoIncrement();
      table.column('name').varchar(20).default('no name').notNull();
      table.column('nickName').varchar(20).nullable().unique();
      table.createdAt().updatedAt();
      table.setGqlOption({
        mutation: {
          fromContextColumns: [],
        },
        subscription: { onCreate: true, onUpdate: true, filter: ['name'] },
      });
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('user');
  };
}
