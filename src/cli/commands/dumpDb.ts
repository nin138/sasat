import { Console } from '../console';
import { getDbClient } from '../..';
import { serializeCreateTable } from '../../db/sql/createTable/createTableSerializer';
import { SerializedStore } from '../../migration/serialized/serializedStore';
import { SqlString } from '../../runtime/query/sql/sqlString';
import { writeYmlFile } from '../../util/fsUtil';
import { DBColumnTypes } from '../../migration/column/columnTypes';
import { config } from '../../config/config';

export const dumpDB = async (): Promise<void> => {
  const con = getDbClient();
  try {
    const tables = await con.rawQuery('show tables').then(it => it.flatMap(it => Object.values(it)));
    const serialized = await Promise.all(
      tables.map(table => {
        return con
          .rawQuery('show create table ' + SqlString.escapeId(table))
          .then(it => it[0]['Create Table'])
          .then(serializeCreateTable);
      }),
    );
    const supportedTypes = Object.values(DBColumnTypes);
    const store: SerializedStore = {
      tables: serialized.filter(it => {
        const notSupported = it.columns.find(it => !supportedTypes.includes(it.type));
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
    Console.error(e.message);
    throw e;
  } finally {
    await con.release();
  }
};
