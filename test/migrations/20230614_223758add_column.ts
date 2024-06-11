import type { SasatMigration, MigrationStore } from 'sasat';

export default class Add_column implements SasatMigration {
  up: (store: MigrationStore) => void = store => {
    store
      .table('user')
      .addColumn('foo', column => column.varchar(20).default('www'));
  };

  down: (store: MigrationStore) => void = () => {
    throw new Error('Down is not implemented on add_column');
  };
}
