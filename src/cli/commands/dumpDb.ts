import { Console } from '../console.js';
import { serializeCreateTable } from '../../db/sql/createTable/createTableSerializer.js';
import { SerializedStore } from '../../migration/serialized/serializedStore.js';
import { SqlString } from '../../runtime/sql/sqlString.js';
import { writeYmlFile } from '../../util/fsUtil.js';
import { DBColumnTypes } from '../../migration/column/columnTypes.js';
import { config } from '../../config/config.js';
import { getDbClient } from '../../db/getDbClient.js';

export const dumpDB = async (): Promise<void> => {
  const con = getDbClient();
  try {
    const tables = await con
      .rawQuery('show tables')
      .then(it => it.flatMap(it => Object.values(it)));
    const serialized = await Promise.all(
      tables.map(table => {
        return con
          .rawQuery('show create table ' + SqlString.escapeId(table as string))
          .then(it => it[0]['Create Table'] as string)
          .then(serializeCreateTable);
      }),
    );
    const supportedTypes = Object.values(DBColumnTypes);
    const store: SerializedStore = {
      tables: serialized.filter(it => {
        if (it.primaryKey.length === 0) {
          Console.error(
            `table ${it.tableName} skipped, reason: missing primary key`,
          );
          return false;
        }
        const notSupported = it.columns.find(
          it => !supportedTypes.includes(it.type),
        );
        if (notSupported) {
          Console.error(
            `table ${it.tableName} skipped,  reason: ${it.tableName}.${notSupported.columnName} column type "${notSupported.type}" is Not Supported`,
          );
          return false;
        }
        return true;
      }),
    };

    writeYmlFile(config().migration.dir, 'initialSchema.yml', store);
  } catch (e) {
    Console.error((e as Error).message);
    throw e;
  } finally {
    await con.release();
  }
};
