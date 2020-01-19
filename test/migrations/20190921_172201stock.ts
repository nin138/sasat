import { MigrationStore, SasatMigration } from '../../src';
import { Relation } from '../../src/entity/relation';

export class Stock implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    store.createTable('stock', table => {
      table
        .column('id')
        .int()
        .autoIncrement()
        .unsigned()
        .primary();
      table.references({
        targetTable: 'user',
        targetColumn: 'user_id',
        columnName: 'user_id',
        relation: Relation.Many,
      });
      table.references({
        targetTable: 'post',
        targetColumn: 'post_id',
        columnName: 'post_id',
        relation: Relation.One,
      });
      table.createdAt();
      table.updatedAt();
      table.addUniqueKey('user_id', 'post_id');
      table.setGqlOption({
        mutation: { delete: true, fromContextColumns: [{ column: 'user_id', contextName: 'userId' }] },
      });
    });
  };
  down: (store: MigrationStore) => void = store => {
    store.dropTable('stock');
  };
}
